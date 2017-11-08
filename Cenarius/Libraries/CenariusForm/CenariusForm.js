/* 
        A library that reads Cenarius-flavoured JSON and produces:
            1. The web form as described
            2. The SQL table schema 
            3. JSON object for DB updates
            
        Author: Joy Yeh
        Inspired by Joshfire's JsonForms
*/
'use strict';

var config = {
    defaultType: 'string',
    defaultTitle: 'key_titleize',
    titleOptions: [
        'key_titleize',
        'key_lower_case',
        'key_upper_case',
        'key'
    ],

    autoCheckboxOptions: [
        'none',
        'single',
        'multi'
    ],
    defaultNumberStep: 0.01,
    autoLabelColon: '',
    autoLabelSpace: '',
    defaultEnumOptionText: '--',

    ui: {
        enumSingle: 'dropdown',
        enumMulti: 'checkboxes',
        subobject: 'tabs-editable',
        eitherGroup: 'tabs',
    },

    nCols: {
        object: '12',
        subobject: '12',
        enum: '6',
        complexEnum: '12',
        input: '6'
    },

    minSubobjectInstance: 1,

    maxLength: {
        float: '',
        integer: '',
        big_string: '4096',
        string: '255',
        boolean: '',
        date: '',
        label: ''
    }
};

const HtmlInputTypeTable = {
    float: 'number',
    integer: 'number',
    big_string: 'text',
    string: 'text',
    boolean: 'checkbox',
    date: 'date',
    label: 'label'
}

const SQLTypeTable = {
    float: 'float',
    integer: 'integer',
    big_string: 'nvarchar',
    string: 'nvarchar',
    boolean: 'bit',
    date: 'date'
}

const formCtrlUpdateEvents = 'keyup change focus';

function domReady() {
    // Fix button stuck in focus when alert shows up
    $('.btn').click(function(event) {
        $(this).blur();
    });

    // Textarea auto resize
    // Credits to https://stackoverflow.com/questions/454202/creating-a-textarea-with-auto-resize
    $('textarea').each(function() {
        this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden;');
    }).on('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    $('textarea').keyup(function() {
        const valLen = $(this).val().length;
        let counterSpan = $(this).siblings('span[name=textarea-counter]');
        const oldCounter = $(counterSpan).html();
        $(counterSpan).html(valLen + oldCounter.substring(oldCounter.indexOf('<br>')));
    });

    $('input[type=checkbox].single-choice-checkbox').change(function() {
        const $currentCkbx = $(this);
        if ($currentCkbx.prop('checked')) {
            $currentCkbx.parent().parent().siblings().each(function() {
                const $otherCkbx = $(this);
                $otherCkbx.find('input[type=checkbox]').each(function() {
                    if ($otherCkbx.prop('checked'))
                        $otherCkbx.trigger('click');
                });
            });
        }
    });

    // Set initial state for checkboxes
    updateAllWCkbxs();
}

function main(global, $) {
    $.fn.cenarius = function(headingText, options) {
        const myFG = new FormGenerator(options.forma, options.formi);
        const formaDoms = myFG.genDoms();

        const contentDoms = DomMaker.genContent(headingText, formaDoms);
        const ctrlDoms = DomMaker.genCtrlPanel(myFG);
        const summaryModalDoms = DomMaker.genSummaryModal();
        const sqlModalDoms = DomMaker.genDebugModal();

        const finalDom =
            $_$('div', {
                id: 'bootstrap-overrides'
            }, [contentDoms, ctrlDoms, summaryModalDoms, sqlModalDoms]);

        this.replaceWith(finalDom);
    }

    $.fn.sortByDepth = function(deepestFirst = true) {
        if (deepestFirst)
            return $(this).sort(function(a, b) {
                return $(b).parents().length - $(a).parents().length;
            });
        else
            return $(this).sort(function(a, b) {
                return $(a).parents().length - $(b).parents().length;
            });
    };
};

class FormGenerator {
    constructor(forma, formi) {
        this.fieldID = 0;
        this.forma = forma;
        this.formi = formi;
        this.data = {};
        this.soMethods = {};
        this.resetDefaultType();
        this.resetDefaultNCols();
        this.unsetForceCheckbox();
    }

    genDoms() {
        const sgSelf = this;
        return _.map(Object.keys(this.forma),
            function(key) {
                return sgSelf.visitFormaNode(sgSelf.forma, key, sgSelf.data);
            }
        );
    }

    visitFormaNode(fNode, key, dNode) {
        const fgSelf = this;

        // Convert strings into a proper fNode
        const inferredType = inferFNodeType(fNode[key], fgSelf.currentDefaultType);
        const fNext =
            typeof(fNode[key]) !== 'object' ?
            (fNode[key] = {
                _title: fNode[key],
                _type: inferredType
            }) :
            fNode[key];

        // Extract flags
        const name =
            fNext.hasOwnProperty('_title') ? fNext._title :
            getNameFromKey(key);

        fNext._type = inferredType;

        // console.log('key: ' + key + ', name: ' + name + ', inferredType: ' + inferredType);
        // console.log('defaultType: ' + this.currentDefaultType);
        // console.log('content: ');
        // console.log(JSON.stringify(fNext, null, 2));

        const children =
            fNext.hasOwnProperty('_properties') ? fNext._properties :
            fNext.hasOwnProperty('_enum') ? fNext._enum :
            fNext.hasOwnProperty('_enum_multi') ? fNext._enum_multi : {};

        const defaultType =
            fNext.hasOwnProperty('_default_type') ? fNext._default_type :
            (inferredType === 'enum' ? 'boolean' : 'string');

        const defaultNCols =
            fNext.hasOwnProperty('_default_cols') ? fNext._default_cols :
            '';

        function sandwich(_dNode = dNode) {
            return _.map(Object.keys(children),
                (nextKey) => {
                    fgSelf.setDefaultType(defaultType);
                    fgSelf.setDefaultNCols(defaultNCols);

                    const resDom = fgSelf.visitFormaNode(children, nextKey, _dNode);

                    fgSelf.resetDefaultType();
                    fgSelf.resetDefaultNCols();

                    return resDom;
                }
            );
        };

        switch (inferredType) {
            case 'object':
                return fgSelf.genObj(fNext, key, name, sandwich, dNode);
            case 'subobject':
                return fgSelf.genSubobj(fNext, key, name, sandwich, dNode);
            case 'enum':
                return fgSelf.genEnum(fNext, key, name, sandwich, dNode);
            case 'space':
                return fgSelf.genSpace(fNext);
            default:
                return fgSelf.genField(fNext, inferredType, key, name, dNode);
        }
    }

    genEitherGroup(fieldID, bodyDoms) {
        console.log('genEitherGroup()');

        // Generate sandwich doms and separate them
        const pages = [];
        $(bodyDoms).children().each(function() {
            const $this = $(this);
            pages.push({
                name: $this.children('div.panel-heading').text(),
                contentDoms: $this.children('div.panel-body').children(),
                attr: {
                    class: pages.length == 0 ? 'active' : ''
                }
            });
        });

        const tabHeaderDoms = _.map(pages, (page) => {
            return DomMaker.genTabRef(identifierize(page.name) + '_groupingtab', page.name, page.attr);
        });

        const tabContentDoms = _.map(pages, (page) => {
            return DomMaker.genTabPane(identifierize(page.name) + '_groupingtab', page.contentDoms, page.attr);
        })

        const egDom =
            $_$('div', {
                name: 'cenarius-either-group'
            }, [
                $_$('ul', {
                    class: 'nav nav-tabs nav-justified',
                    id: fieldID + '_tabs',
                    name: 'cenarius-either-group-tabheaders'
                }, tabHeaderDoms),

                $_$('div', {
                    class: 'tab-content col-md-12',
                    name: 'cenarius-either-group-tabcontent'
                }, tabContentDoms)
            ]);

        return egDom;
    }

    genObj(fNode, key, name, sandwich, dNode) {
        console.log('genObj(' + key + ')');

        //Not a field so do not increment this.fieldID
        const fieldID = key + '_grouping';

        const headingDoms = [name];
        if (fNode.hasOwnProperty('_help_text'))
            headingDoms.push($_$('div', {
                class: 'alert alert-info'
            }, [fNode._help_text]))

        const sandwichDoms = sandwich(dNode);
        const bodyDoms =
            fNode._grouping === 'either' ?
            [this.genEitherGroup(fieldID, sandwichDoms)] :
            sandwichDoms;

        const nCols =
            fNode.hasOwnProperty('_cols') ?
            fNode._cols : config.nCols.object;

        return DomMaker.genPanel(
            headingDoms,
            bodyDoms,
            nCols, {
                name: 'cenarius-object-group',
                excludeFromSummary: fNode._exclude_from_summary,
                summaryBreakStyle: fNode._summary_break_style
            }, {
                class: fNode._html_class
            }
        );
    };

    genSubobj(fNode, key, name, sandwich, dNode) {
        console.log('genSubobj(' + key + ')');
        const fgSelf = this;

        // Increase field ID to avoid duplicate SO names
        const fieldID = this.getNextID(key);
        fNode._fieldID = fieldID;

        const soDNode = {
            _type: fNode._type,
            _instances: {}
        };
        dNode[fieldID] = soDNode;

        const soTabHeaderDom =
            $_$('ul', {
                class: 'nav nav-tabs',
                name: 'subobject-tabheaders',
                id: fieldID + '_tabs'
            });
        const soTabContentDom =
            $_$('div', {
                class: 'tab-content col-md-12',
                name: 'subobject-tabcontent'
            });

        const fidBeforeSandwich = this.fieldID;
        const makeSOI = () => {
            const keys = _.map(Object.keys(soDNode._instances), (k) => {
                return Number(k);
            });
            const idx = String(
                keys.length > 0 ?
                (keys.reduce((a, b) => {
                    return Math.max(a, b)
                }) + 1) : 1
            );
            const soID = fieldID + '-so-instance-' + idx;

            soDNode._instances[idx] = {};

            fgSelf.fieldID = fidBeforeSandwich;
            $(soTabHeaderDom).append(
                DomMaker.genTabRef(
                    soID,
                    '#' + idx));
            $(soTabContentDom).append(
                DomMaker.genTabPane(
                    soID,
                    sandwich(soDNode._instances[idx])));

            $(soTabHeaderDom).children().removeClass('active')
            $(soTabHeaderDom).children(':last-child').addClass('active');
            $(soTabContentDom).children().removeClass('active');
            $(soTabContentDom).children(':last-child').addClass('active in');

            updateAllWCkbxs();
        }
        const newTabBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-default btn-md cenarius-new-tab-btn',
                name: 'new_tab_btn'
            }, [
                $_$('span', {
                    class: 'glyphicon glyphicon-plus'
                })
            ]);
        $(newTabBtn).on('click', makeSOI);

        // Generate initial minimum number of subobj
        const genMinSOI = () => {
            const curr = $(soTabHeaderDom).children().length;
            for (let i = curr; i < config.minSubobjectInstance; i++)
                makeSOI();
        }
        genMinSOI();

        const delSOI = () => {
            // Find active tab
            const activeHeader = $(soTabHeaderDom).children('.active')[0];
            const activeContent = $(soTabContentDom).children('.active')[0];

            // Active a different tab (try next the try prev)
            const nextHeader = $(activeHeader).next('li.cenarius-tab-ref');
            const prevHeader = $(activeHeader).prev('li.cenarius-tab-ref');
            if (nextHeader.length > 0) {
                const nextContent = $(activeContent).next('div.cenarius-tab-pane');
                nextHeader.addClass('active');
                nextContent.addClass('active in');
            } else if (prevHeader.length > 0) {
                const prevContent = $(activeContent).prev('div.cenarius-tab-pane');
                prevHeader.addClass('active');
                prevContent.addClass('active in');
            } // If both conditions fail then there are no instances left

            // Remove UI and data
            const activeIdx = $(activeHeader).text().replace('#', '');
            delete soDNode._instances[activeIdx];
            activeHeader.remove();
            activeContent.remove();

            genMinSOI();
        }
        const delTabBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-default btn-md cenarius-del-tab-btn',
                name: 'del_tab_btn'
            }, [$_$('span', {
                class: 'glyphicon glyphicon-remove'
            })]);
        $(delTabBtn).on('click', delSOI);

        // Generate initial minimum number of subobj
        const clearSOI = () => {
            const curr = $(soTabHeaderDom).children().length;
            for (let i = 0; i < curr; i++)
                delSOI();
        }

        this.soMethods[fieldID] = {
            makeSOI: makeSOI,
            delSOI: delSOI,
            genMinSOI: genMinSOI,
            clearSOI: clearSOI
        };

        // Prepare panel heading 
        const panelHeadingFunc = (headingDoms = []) => {
            headingDoms.push(
                $_$('div', {
                    style: 'float: right;'
                }, [
                    delTabBtn,
                    newTabBtn
                ])
            );

            return DomMaker.genPanelHeading(headingDoms, 'overflow: hidden');
        };

        const headingDoms = [name];
        if (fNode.hasOwnProperty('_help_text'))
            headingDoms.push($_$('div', {
                class: 'alert alert-info',
                style: ''
            }, [fNode._help_text]));

        const nCols =
            fNode.hasOwnProperty('_cols') ?
            fNode._cols : config.nCols.subobject;

        return DomMaker.genPanel(
            headingDoms, [soTabHeaderDom, soTabContentDom],
            nCols, {
                name: 'cenarius-subobject-group',
                excludeFromSummary: fNode._exclude_from_summary,
                summaryBreakStyle: fNode._summary_break_style
            }, {
                class: fNode._html_class
            }, panelHeadingFunc);
    };

    genEnum(fNode, key, name, sandwich, dNode) {
        console.log('genEnum(' + key + ')');

        const fieldID = this.getNextID(key);
        fNode._fieldID = fieldID;

        let enumData;
        let simpleEnum = true;

        // Determine whether enum is a complex one
        const isMultiChoice = fNode.hasOwnProperty('_enum_multi');
        if (isMultiChoice) {
            enumData = fNode._enum_multi;
            simpleEnum = false;
        } else {
            enumData = fNode._enum;
            _.each(enumData, (item) => {
                const itemType = inferFNodeType(item);
                const isSimpleItem = isRawType(itemType);
                simpleEnum &= isSimpleItem;
                if (!isSimpleItem) {
                    console.log('enum is complex because of item (' + itemType + '):');
                    console.log(item);
                }
            });
        }

        const extraHtmlClass =
            fNode.hasOwnProperty('_html_class') ?
            fNode._html_class : '';
        const nCols = fNode.hasOwnProperty('_cols') ? fNode._cols :
            this.currentDefaultNCols !== '' ? this.currentDefaultNCols :
            simpleEnum ? config.nCols.enum :
            config.nCols.complexEnum;

        const needCheckbox =
            this.forceCheckbox !== 'none' || (fNode._force_checkbox === true);

        // Default value
        const defaultValue = fNode.hasOwnProperty('_default_value') ? fNode._default_value : 0;

        return (() => {
            if (simpleEnum) {
                const selectOptions = [];

                // Prepend null option if checkbox will be added
                if (needCheckbox)
                    selectOptions.push($_$('option', {}, [config.defaultEnumOptionText]));

                // Convert string items in array to objects
                // that contain useful attributes
                _.each(Object.keys(enumData), (enumKey) => {
                    let item = enumData[enumKey];
                    if (typeof item !== 'object') {
                        item = (
                            enumData[enumKey] = {
                                _title: item
                            });
                    }
                    item._fieldID =
                        identifierize(fieldID + '_equals_' + item._title);
                    item._type = 'boolean';

                    dNode[item._fieldID] = {
                        _type: 'bit'
                    };

                    selectOptions.push($_$('option', {}, [item._title]));
                })

                const selectDom = $_$('select', {
                    class: 'selectpicker form-control',
                    id: fieldID,
                    name: fieldID,
                    'data-live-search': true,
                    defaultValue: defaultValue
                }, selectOptions);
                $(selectDom).on(formCtrlUpdateEvents, formCtrlUpdateCkbx);

                // The value of "true" is required - "undefined" only works sometimes
                const $defaultOption = $($(selectDom).children()[defaultValue]);
                $defaultOption.attr('selected', true);
                $defaultOption.attr('defaultOption', '');

                const inputName = name + config.autoLabelColon + config.autoLabelSpace;
                const inputDoms =
                    [
                        $_$('span', {
                            class: 'input-group-addon cenarius-input-tag'
                        }, [$_$('b', {}, [inputName])]),
                        selectDom
                    ];

                const ckbxWrappedDoms =
                    DomMaker.genCheckboxWrapper(
                        fieldID,
                        this.forceCheckbox,
                        inputDoms,
                        function() {
                            if (!$(this).is(':checked')) {
                                const $mySelectDom =
                                    $($(this).siblings('span')
                                        .children('span').children('select'));
                                $($mySelectDom.children()).removeAttr('selected');

                                // Unticking ckeckbox should lead to '--' being selected
                                // Not the default value (which is from reset-fields)
                                $($mySelectDom.children()[0]).attr('selected', true);
                                $mySelectDom.trigger('change');
                            }
                        });

                // Initial value is set by trigger in domReady()
                $(selectDom).change(function() {
                    _.map(Object.keys(enumData), (enumKey) => {
                        dNode[enumData[enumKey]._fieldID]._value = needCheckbox　 ?
                            (enumKey == this.selectedIndex - 1) :
                            (enumKey == this.selectedIndex);
                    })
                });

                return $_$('div', {
                    name: 'cenarius-input-group',
                    class: 'col-md-' + nCols + ' ' + extraHtmlClass,
                    excludeFromSummary: fNode._exclude_from_summary,
                    summaryBreakStyle: fNode._summary_break_style,
                    titleInSummary: fNode._title_in_summary
                }, [
                    $_$('div', {
                        class: 'input-group'
                    }, needCheckbox ? ckbxWrappedDoms : inputDoms)
                ]);
            } else {
                const choiceTypeIcon =
                    $_$('span', {
                        class: 'pull-right glyphicon glyphicon-tag' +
                            (isMultiChoice ? 's' : ''),
                        name: 'choice-type-icon'
                    });

                this.setForceCheckbox(isMultiChoice);
                const dom =
                    DomMaker.genPanel([name, choiceTypeIcon],
                        sandwich(dNode),
                        nCols, {
                            name: (isMultiChoice ?
                                'cenarius-multi-choice-group' :
                                'cenarius-single-choice-group'),
                            id: fieldID,
                            excludeFromSummary: fNode._exclude_from_summary,
                            summaryBreakStyle: fNode._summary_break_style,
                            titleInSummary: fNode._title_in_summary
                        }, {
                            class: extraHtmlClass
                        }
                    );
                this.unsetForceCheckbox();
                return dom;
            }
        })();
    };

    genField(fNode, type, key, name, dNode) {
        console.log('genField(' + type + ', ' + key + ', \"' + name + '\")');

        const fieldID = isPositiveInt(key) ?
            this.getNextID(name) : this.getNextID(key);
        fNode._fieldID = fieldID;
        const myDNode = {
            _type: fNode._type
        };

        // Type related flags
        const htmlInputType = HtmlInputTypeTable[type];
        const isTextArea = type === 'big_string';
        const inputTag = isTextArea ? 'textarea' : 'input';

        // Value related flags
        let defaultValue = '';
        if (fNode.hasOwnProperty('_default_value')) {
            defaultValue = fNode._default_value;
        } else {
            if (htmlInputType === 'number') {
                defaultValue = '0';
            } else if (htmlInputType === 'date') {
                defaultValue = (new Date()).toISOString().slice(0, 10);
            }
        }

        // Number flags
        const numStep = type === 'integer' ? 1 :
            (fNode.hasOwnProperty('_number_step') ?
                fNode._number_step : config.defaultNumberStep);
        const numMin = fNode.hasOwnProperty('_min') ?
            fNode._min : '';
        const numMax = fNode.hasOwnProperty('_max') ?
            fNode._max : '';

        // String flags
        const maxStringLength =
            isInt(fNode._max_string_length) ?
            fNode._max_string_length : config.maxLength[type];

        const textAlignment = isTextArea ?
            '' : 'text-align: right; ';
        const textAreaRows = isTextArea ?
            (fNode.hasOwnProperty('_textarea_rows') ?
                fNode._textarea_rows : '5') : '';

        const fieldStyle = textAlignment;
        const fieldName = name + config.autoLabelColon + config.autoLabelSpace;
        const needCheckbox =
            this.forceCheckbox !== 'none' || fNode._force_checkbox === true;
        const endingSpan = (() => {
            if (fNode.hasOwnProperty('_ending')) {
                return $_$('span', {
                    class: 'input-group-addon cenarius-input-tag'
                }, [fNode._ending]);
            } else if (type === 'big_string') {
                return $_$('span', {
                    class: 'input-group-addon cenarius-input-tag',
                    name: 'textarea-counter'
                }, [defaultValue.length + '<br>------<br>' + maxStringLength]);
            } else {
                return undefined;
            }
        })();

        // Generate the field html which might include an input addon and an ending
        const inputDoms =
            (() => {
                switch (htmlInputType) {
                    case 'label':
                        {
                            const labelDom =
                                $_$('div', {
                                    class: 'alert alert-success',
                                    style: 'text-align: center'
                                }, [fieldName]);
                            return [labelDom];
                        }
                    case 'checkbox':
                        {
                            const ckbxProps = {
                                type: 'checkbox',
                                id: fieldID,
                                name: fieldID,
                                class: this.forceCheckbox === 'single' ? 'single-choice-checkbox' : '',
                                autocomplete: 'off',
                            }

                            if (defaultValue === true) ckbxProps.checked = true;
                            const ckbxInputDom = $_$('input', ckbxProps);

                            myDNode._value = $(ckbxInputDom).is(':checked');
                            $(ckbxInputDom).change(function() {
                                myDNode._value = $(this).is(':checked')
                            });

                            const ckbxDoms =
                                [
                                    ckbxInputDom,
                                    $_$('label', {
                                        for: fieldID,
                                        class: 'btn btn-default cenarius-ckbx-btn checkbox-displayer'
                                    }, [
                                        $_$('span', {
                                            class: 'glyphicon glyphicon-ok cenarius-chbkx-icon'
                                        })
                                    ]),
                                    $_$('label', {
                                        for: fieldID,
                                        class: 'btn btn-default cenarius-ckbx-lbl'
                                    }, [name])
                                ];
                            return ckbxDoms;
                        }
                    case 'text':
                    case 'number':
                    case 'date':
                        {
                            const regularInputProps = {
                                class: 'form-control',
                                style: fieldStyle,
                                id: fieldID,
                                name: fieldID,
                                type: htmlInputType,
                                step: numStep,
                                defaultValue: defaultValue,
                                value: defaultValue
                            };
                            if (numMin.length > 0) regularInputProps.min = numMin;
                            if (numMax.length > 0) regularInputProps.max = numMax;
                            if (defaultValue.length > 0) regularInputProps.value = defaultValue;
                            if (textAreaRows.length > 0) regularInputProps.rows = textAreaRows;
                            if (maxStringLength.length > 0) regularInputProps.maxlength = maxStringLength;

                            const regularInputDom =
                                $_$(inputTag, regularInputProps, [defaultValue]);
                            $(regularInputDom).on(formCtrlUpdateEvents, formCtrlUpdateCkbx);

                            myDNode._value = $(regularInputDom).val();
                            $(regularInputDom).change(function() {
                                myDNode._value = $(this).val()
                            });

                            const regularFieldDoms =
                                [
                                    $_$('span', {
                                        class: 'input-group-addon cenarius-input-tag'
                                    }, [$_$('b', {}, [fieldName])]),
                                    regularInputDom
                                ];

                            if (isSet(endingSpan))
                                regularFieldDoms.push(endingSpan);

                            if (needCheckbox) {
                                // This should only happen in complex lists
                                const ckbxWrappedDoms =
                                    DomMaker.genCheckboxWrapper(
                                        fieldID,
                                        this.forceCheckbox,
                                        regularFieldDoms,
                                        function() {
                                            const $this = $(this);
                                            if (!$this.is(':checked')) {
                                                const inputDom = $this.siblings('span').children('span')
                                                    .children(inputTag);
                                                $(inputDom).val('');
                                                $(inputDom).trigger('change');
                                            }
                                        });
                                return ckbxWrappedDoms;
                            } else {
                                return regularFieldDoms;
                            }
                        }
                    default:
                        {
                            return $_$('p', {}, [$_$('b', {}, ['[CenariusFormError] Unknown field type: ' + type])]);
                        }
                }
            })();

        const nCols = fNode.hasOwnProperty('_cols') ? fNode._cols :
            this.currentDefaultNCols !== '' ? this.currentDefaultNCols :
            config.nCols.input;
        const extraHtmlClass = fNode.hasOwnProperty('_html_class') ?
            fNode._html_class : '';

        dNode[fieldID] = myDNode;

        return $_$('div', {
            name: 'cenarius-input-group',
            class: 'col-md-' + nCols + ' ' + extraHtmlClass,
            excludeFromSummary: fNode._exclude_from_summary,
            summaryBreakStyle: fNode._summary_break_style,
            titleInSummary: fNode._title_in_summary
        }, [
            $_$('div', {
                    class: 'input-group',
                    style: 'width: 100% !important'
                },
                inputDoms)
        ]);
    };

    genSpace(fNode) {
        const nCols = fNode.hasOwnProperty('_cols') ? fNode._cols :
            this.currentDefaultNCols !== '' ? this.currentDefaultNCols :
            config.nCols.input;
        const extraHtmlClass = fNode.hasOwnProperty('_html_class') ?
            fNode._html_class : '';

        return $_$('div', {
            class: 'col-md-offset-' + nCols + ' ' + extraHtmlClass,
            style: 'height: 46px !important',
            excludeFromSummary: true
        });
    }

    resetDefaultType() {
        // console.log('resetDefaultType()');
        this.setDefaultType(config.defaultType);
    }

    setDefaultType(type) {
        // console.log('setDefaultType(' + type + ')');
        this.currentDefaultType = type;
    }

    resetDefaultNCols() {
        this.setDefaultNCols(12);
    }

    setDefaultNCols(nCols) {
        this.currentDefaultNCols = nCols;
    }

    unsetForceCheckbox() {
        this.forceCheckbox = 'none';
        // console.log('setForceCheckbox(' + this.forceCheckbox + ')');
    }

    setForceCheckbox(isMultiChoice) {
        this.forceCheckbox = isMultiChoice ? 'multi' : 'single';
        // console.log('setForceCheckbox(' + this.forceCheckbox + ')');
    }

    getNextID(key) {
        const id = identifierize(key + '_f' + this.fieldID);
        this.fieldID++;
        return id;
    }
};

class DomMaker {
    static genCheckboxWrapper(
        fieldID,
        checkboxType,
        fieldDoms,
        ckbxDomOnChange = () => {}) {
        const checkboxID = fieldID + '_wckbx';
        const ckbxDom =
            $_$('input', {
                type: 'checkbox',
                id: checkboxID,
                name: checkboxID,
                class: checkboxType === 'single' ? 'single-choice-checkbox' : '',
                autocomplete: 'off'
            });
        $(ckbxDom).change(ckbxDomOnChange);

        return [
            ckbxDom,
            $_$('label', {
                for: checkboxID, // Do not allow manual toggle
                readonly: true,
                class: 'btn btn-default cenarius-ckbx-btn checkbox-displayer'
            }, [
                $_$('span', {
                    class: 'glyphicon glyphicon-ok cenarius-chbkx-icon'
                })
            ]),
            $_$('span', {
                style: 'width:100%; display: table-cell',
                class: 'cenarius-checkbox-wrapper'
            }, [
                $_$('span', {
                    style: 'width:100%; min-height: 34px; display: table'
                }, fieldDoms)
            ])
        ];
    };

    static genContent(headingText, formaDoms) {
        return $_$('div', {
            class: 'container',
            name: 'cenarius-content'
        }, [
            $_$('div', {
                class: 'row',
                name: 'cenarius-header',
            }, [$_$('h1', {}, [headingText])]),
            $_$('form', {
                class: 'row',
                name: 'cenarius-form',
                action: '/Home/Test1',
                method: 'post'
            }, [$_$('div', {
                class: 'col-md-12',
                style: 'padding-bottom: 10px'
            }, formaDoms)])
        ]);
    };

    static genCtrlPanel(formGen) {
        const resetFieldsBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-danger btn-lg reset-btn',
            }, [
                $_$('span', {
                    class: 'glyphicon glyphicon-trash'
                }), [' Reset Fields']
            ]);
        $(resetFieldsBtn).on('click', function(e) {
            if (confirm('Are you sure you want to reset (clear) all fields?')) {
                $('input').each(function() {
                    const $this = $(this);

                    if ($this.prop('type') === 'checkbox') {
                        setCheckbox($this, false);
                    } else {
                        const defaultValue = $this.prop('defaultValue');
                        $this.prop('value', defaultValue);
                    }
                })

                $('textarea').each(function() {
                    const $this = $(this);
                    $this.prop('value', $this.prop('defaultValue'));
                })

                _.each($('select').children(), (sc) => {
                    sc.removeAttribute('selected');
                    if ($(sc).is('[defaultOption]'))
                        $(sc).attr('selected', true);
                });

                _.each(Object.keys(formGen.soMethods), (somKey)=>{
                    const som = formGen.soMethods[somKey];
                    som.clearSOI();
                    som.genMinSOI();
                });
            }
        })

        const genSumBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-success btn-lg summarize-btn',
                'data-toggle': 'modal',
                'data-target': '#summary_modal'
            }, [
                $_$('span', {
                    class: 'glyphicon glyphicon-book'
                }), [' Summarize']
            ]);
        $(genSumBtn).on('click', function(e) {
            const $summary = $('#summary_modal .modal-dialog .modal-content .modal-body');
            const summaryHtml =
                SummaryGenerator.gen(
                    formGen.forma,
                    $(this).parent().siblings('div[name=cenarius-content]')
                    .children('form[name=cenarius-form]')
                );
            $summary.html(summaryHtml);
        })

        const genDebugBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-primary btn-lg debug-btn',
                'data-toggle': 'modal',
                'data-target': '#debug_modal'
            }, [
                $_$('span', {
                    class: 'glyphicon glyphicon-exclamation-sign'
                }), [' Debug']
            ]);
        $(genDebugBtn).on('click', function(e) {
            const tableName = identifierize(String(formGen.formi['table_name']));

            const diHeaderDom =
                $_$('ul', {
                    class: 'nav nav-tabs',
                    name: 'debuginfo-tabheaders'
                });
            diHeaderDom.append(
                DomMaker.genTabRef('di-schema', 'Schema', {
                    class: 'active'
                })
            );
            diHeaderDom.append(
                DomMaker.genTabRef('di-tables', 'Tables')
            );
            diHeaderDom.append(
                DomMaker.genTabRef('di-forma', 'Forma')
            );
            diHeaderDom.append(
                DomMaker.genTabRef('di-data', 'Data')
            );
            const diContentDom =
                $_$('div', {
                    class: 'tab-content col-md-12',
                    name: 'debuginfo-tabcontent'
                });

            const sqlGen = new SQLSchemaGenerator(formGen.forma, tableName);
            diContentDom.append(
                DomMaker.genTabPane('di-schema', [
                    $_$('pre', {
                        style: 'white-space: pre-wrap'
                    }, [
                        sqlGen.gen()
                    ])
                ], {
                    class: 'active in'
                })
            );
            diContentDom.append(
                DomMaker.genTabPane('di-tables', [
                    $_$('pre', {
                        style: 'white-space: pre-wrap'
                    }, [
                        JSON.stringify(sqlGen.tables, null, 2)
                    ])
                ])
            );
            diContentDom.append(
                DomMaker.genTabPane('di-forma', [
                    $_$('pre', {
                        style: 'white-space: pre-wrap'
                    }, [
                        JSON.stringify(formGen.forma, null, 2)
                    ])
                ])
            );
            diContentDom.append(
                DomMaker.genTabPane('di-data', [
                    $_$('pre', {
                        style: 'white-space: pre-wrap'
                    }, [
                        JSON.stringify(formGen.data, null, 2)
                    ])
                ])
            );

            const $sql = $('#debug_modal .modal-dialog .modal-content .modal-body');

            $sql.replaceWith($_$('div', {
                class: 'modal-body',
                style: 'display: inline-block'
            }, [diHeaderDom, diContentDom]));
        })

        return $_$('div', {
            class: 'container',
            name: 'cenarius-ctrl-panel',
            style: 'padding: 0'
        }, [
            resetFieldsBtn,
            genSumBtn,
            genDebugBtn
        ]);
    };

    static genSummaryModal() {
        const submitBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-primary',
                id: 'submit_btn',
                'data-dismiss': 'modal'
            }, ['Submit']);
        $(submitBtn).on('click', function() {
            const formData = $('form[name=cenarius-form]').serializeArray();
            const str = JSON.stringify(formData);
            alert(str);
        });

        const copyBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-success',
                'data-dismiss': 'modal'
            }, ['Copy']);

        $(copyBtn).on('click',
            function(e) {
                e.stopPropagation();
                const res = copyToClipboard($(this).parent().siblings('.modal-body')[0]);
                if (res)
                    showSnackbar('Copied to clipboard.');
                else
                    showSnackbar('Browser does not support copy function.');
            });

        return $_$('div', {
            class: 'modal fade',
            id: 'summary_modal',
            role: 'dialog',
            tabindex: -1
        }, [
            $_$('div', {
                class: 'modal-dialog modal-lg'
            }, [
                $_$('div', {
                    class: 'modal-content'
                }, [
                    $_$('div', {
                        class: 'modal-header'
                    }, [
                        $_$('button', {
                            type: 'button',
                            class: 'close',
                            'data-dismiss': 'modal'
                        }, ['&times;']),
                        $_$('h4', {
                            class: 'modal-title'
                        }, ['Form Summary'])
                    ]),
                    $_$('div', {
                        class: 'modal-body'
                    }, [
                        $_$('p', {}, ['//Summary Placeholder//'])
                    ]),
                    $_$('div', {
                        class: 'modal-footer'
                    }, [
                        $_$('button', {
                            type: 'button',
                            class: 'btn btn-default',
                            'data-dismiss': 'modal',
                            style: 'float: left'
                        }, ['Close']),
                        copyBtn,
                        submitBtn
                    ])
                ])
            ])
        ]);
    };

    static genDebugModal() {
        const copyBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-success',
                'data-dismiss': 'modal',
                style: 'float:right'
            }, ['Copy']);
        $(copyBtn).on('click',
            function(e) {
                e.stopPropagation();
                const res = copyToClipboard($(this).parent()
                    .siblings('.modal-body')
                    .children('div[name=debuginfo-tabcontent]')
                    .children('.active')
                    .children('pre')[0]);
                if (res)
                    showSnackbar('Copied to clipboard.');
                else
                    showSnackbar('Browser does not support copy function.');
            });

        return $_$('div', {
            class: 'modal fade',
            id: 'debug_modal',
            role: 'dialog',
            tabindex: -1
        }, [
            $_$('div', {
                class: 'modal-dialog modal-lg'
            }, [
                $_$('div', {
                    class: 'modal-content'
                }, [
                    $_$('div', {
                        class: 'modal-header'
                    }, [
                        $_$('button', {
                            type: 'button',
                            class: 'close',
                            'data-dismiss': 'modal'
                        }, ['&times;']),
                        $_$('h4', {
                            class: 'modal-title'
                        }, ['Debug Info']),
                        copyBtn
                    ]),
                    $_$('div', {
                        class: 'modal-body'
                    }, [
                        $_$('p', {}, ['//Placeholder//'])
                    ]),
                    $_$('div', {
                        class: 'modal-footer'
                    }, [
                        $_$('button', {
                            type: 'button',
                            class: 'btn btn-default',
                            'data-dismiss': 'modal'
                        }, ['Close'])
                    ])
                ])
            ])
        ]);
    };

    static genTabRef(
        hrefLink,
        tabTitle,
        liAttr = {},
        titleAttr = {}) {
        return $_$('li', mergeStrProps({
            class: 'cenarius-tab-ref'
        }, liAttr), [
            $_$('a', mergeStrProps({
                'data-toggle': 'tab',
                href: '#' + hrefLink
            }, titleAttr), [
                $_$('b', {}, [tabTitle])
            ])
        ]);
    };

    static genTabPane(id, contentDoms, attr = {}) {
        return $_$('div', mergeStrProps({
            id: id,
            class: 'tab-pane cenarius-tab-pane'
        }, attr), contentDoms);
    }

    static genPanelHeading(contentDoms, styleStr = '') {
        return $_$('div', {
            class: 'panel-heading',
            style: styleStr
        }, contentDoms);
    };

    static genPanelBody(contentDoms, styleStr = '') {
        return $_$('div', {
            class: 'panel-body',
            style: styleStr
        }, contentDoms);
    };

    static genPanel(
        headingDoms,
        bodyDoms,
        nCols = 12,
        wrapperProps = {},
        panelProps = {},
        headingFunc = this.genPanelHeading,
        bodyFunc = this.genPanelBody) {
        return $_$('div', mergeStrProps({
            class: 'col-md-' + nCols
        }, wrapperProps), [
            $_$('div', mergeStrProps({
                class: 'panel panel-default clearfix ',
            }, panelProps), [headingFunc(headingDoms),
                bodyFunc(bodyDoms)
            ])
        ]);
    };
}

class SummaryGenerator {
    constructor() {};

    getPlainText(ph) {
        const singleLevelText =
            $(ph).clone() //clone the element
            .children() //select all the children
            .remove() //remove all the children
            .end() //again go back to selected element
            .text();
        return singleLevelText.length > 0 ? singleLevelText : ph.text();
    }

    genObjectGroup(parent) {
        const sgSelf = this;
        const panelHeading = $(parent).children('.panel').children('.panel-heading');
        const name = this.getPlainText(panelHeading);
        const body = $(parent).children('.panel').children('.panel-body');

        let str = name + '<br><br>';

        const subdoms = $(body).children();
        for (let i = 0; i < subdoms.length; i++) {
            str += sgSelf.visitDomNode(subdoms[i]);
        }
        str += '<br>End of ' + name + '<br><br>';

        return str;
    };

    genSubobjectGroup(parent) {
        const sgSelf = this;
        const panelHeading = $(parent).children('.panel').children('.panel-heading');
        const name = this.getPlainText(panelHeading);
        const tabHeaders = $(parent).children('.panel')
            .children('.panel-body').children('ul[name=subobject-tabheaders]');
        const tabContent = $(parent).children('.panel')
            .children('.panel-body').children('div[name=subobject-tabcontent]');

        let str = name + '(#)<br><br>';

        str += mapJoin(tabHeaders.children(), function(tabHeader) {
            const tabName = sgSelf.getPlainText($(tabHeader));
            let tabHref = $(tabHeader).children('a')[0].getAttribute('href');
            const tabID = tabHref.substring(tabHref.lastIndexOf('#'));
            const tabBody = $(tabContent).children(tabID);

            const tabBodyStr = mapJoin($(tabBody).children(), function(tabBodyElt) {
                return sgSelf.visitDomNode(tabBodyElt);
            });


            return tabName + ':<br>' + tabBodyStr + '<br><br>';
        }, '<br>');
        str += 'End of ' + name + '<br><br>';

        return str;
    };

    genSingleChoiceGroup(parent) {
        const sgSelf = this;
        const panelHeading = $(parent).children('.panel').children('.panel-heading');
        const ckbx = $(parent).children('.panel').children('.panel-body')
            .find('div[name=cenarius-input-group] > div.input-group > input[type=checkbox]:checked');
        let includeTitle = $(parent).attr('titleInSummary');
        if (!isSet(includeTitle))
            includeTitle = true;
        const title = includeTitle ? this.getPlainText(panelHeading) : '';

        let val = '';
        if (ckbx.length == 0) {
            val = 'unknown (not selected)';
        } else {
            const lbl = $(ckbx).siblings('label.cenarius-ckbx-lbl');
            if (lbl.length > 0) {
                val = lbl.text();
            } else {
                // Checkbox-wrapped regular input field
                const $wrapperSpan = $($(ckbx).siblings('span.cenarius-checkbox-wrapper').children('span'));
                val = $wrapperSpan.children('span.input-group-addon').text() +
                    ' (' + $wrapperSpan.children('input').val() + ')';
            }
        }

        return (includeTitle ? (title + ': ') : '') + val + '. ';
    };

    genMultiChoiceGroup(parent) {
        const sgSelf = this;
        const panelHeading = $(parent).children('.panel').children('.panel-heading');
        const ckbxs = $(parent).children('.panel').children('.panel-body')
            .find('div[name=cenarius-input-group] > div.input-group > input[type=checkbox]:checked');
        let includeTitle = $(parent).attr('titleInSummary');
        if (!isSet(includeTitle))
            includeTitle = true;
        const title = includeTitle ? this.getPlainText(panelHeading) : '';

        let val = '';
        if (ckbxs.length == 0) {
            val = 'unknown (not selected)';
        } else {
            val = mapJoin($(ckbxs), function(ckbx) {
                const lbl = $(ckbx).siblings('label.cenarius-ckbx-lbl');
                if (lbl.length > 0) {
                    return lbl.text();
                } else {
                    // Checkbox-wrapped regular input field
                    const $wrapperSpan = $($(ckbx).siblings('span.cenarius-checkbox-wrapper').children('span'));
                    return $wrapperSpan.children('span.input-group-addon').text() +
                        ' (' + $wrapperSpan.children('input').val() + ')';
                }
            }, ', ');
        }

        return (includeTitle ? (title + ': ') : '') + val + '. ';
    };

    genEitherGroup(parent) {
        const sgSelf = this;
        const activeTab = $(parent).children('div[name=cenarius-either-group-tabcontent]')
            .children('.tab-pane.active')
        const activeTabRef = $(parent).children('ul[name=cenarius-either-group-tabheaders]')
            .children('li.active');
        const activeTabName = this.getPlainText(activeTabRef);


        let str = activeTabName + ' {<br>';

        const tabContent = $(activeTab).children();
        for (let i = 0; i < tabContent.length; i++) {
            str += sgSelf.visitDomNode(tabContent[i]);
        }
        str += '<br>eg}';

        return str;
    };

    genInputGroup(parent) {
        const sgSelf = this;
        const $body = $($(parent).children('.input-group'));

        const $selectElt = $($body.children('select'));
        const $ckbxElt = $($body.children('input[type=checkbox]'));
        const $cbkxWrapper = $($body.children('.cenarius-checkbox-wrapper'));
        const $alertElt = $($body.children('div.alert'));
        const $textareaElt = $($body.children('textarea'));
        let includeTitle = $(parent).attr('titleInSummary');
        if (!isSet(includeTitle))
            includeTitle = true;

        const eltExists = (selRes) => {
            return selRes.length > 0;
        };

        const igas = $body.children('span.input-group-addon');
        let title = $(igas[0]).text();
        let id = '';
        let val = '';
        let ending = igas.length > 1 ? $(igas[1]).text() : '';
        let addPeriod = true;

        if (eltExists($alertElt)) {
            id = $alertElt.attr('id');
            val = $alertElt.text();
        } else if (eltExists($selectElt)) {
            id = $selectElt.attr('id');
            val = $selectElt.val();
        } else if (eltExists($ckbxElt)) {
            // Regular checkbox field
            id = $ckbxElt.attr('id');
            if ($ckbxElt.prop('checked')) {
                if (eltExists($cbkxWrapper)) {
                    const $wrapperSpan = $cbkxWrapper.children('span');
                    title = $wrapperSpan.children('span.input-group-addon').text();
                    val = $wrapperSpan.children('input').val();
                } else {
                    title = $body.children('.cenarius-ckbx-lbl').text();
                    val = 'yes';
                }
            }
        } else if (eltExists($textareaElt)) {
            id = $ckbxElt.attr('id');
            val = $textareaElt.val();
            addPeriod = false;

            // Do not inlcude counter text
            if ($(igas[1]).attr('name') === 'textarea-counter')
                ending = '';
        } else {
            // Regular input field
            id = $body.children('input').attr('id');
            val = $body.children('input').val();
        }

        if (ending.length > 0)
            ending = ' ' + ending;

        return (includeTitle ? (title + ': ') : '') + val + ending + (addPeriod ? '. ' : '');
    };

    visitDomNode(dom) {
        const $dom = $(dom);
        const skip = $dom.attr('excludeFromSummary') === 'true';

        const domName = $dom.attr('name');
        const breakStyle = $dom.attr('summaryBreakStyle');
        const brBefore = breakStyle === 'before' ? '<br>' : '';
        const brAfter = breakStyle === 'after' ? '<br>' : '';

        let res = '';
        switch (domName) {
            case 'cenarius-object-group':
                {
                    res = brBefore + this.genObjectGroup(dom) + brAfter;
                    break;
                }
            case 'cenarius-subobject-group':
                {
                    res = brBefore + this.genSubobjectGroup(dom) + brAfter;
                    break;
                }
            case 'cenarius-single-choice-group':
                {
                    res = brBefore + this.genSingleChoiceGroup(dom) + brAfter;
                    break;
                }
            case 'cenarius-multi-choice-group':
                {
                    res = brBefore + this.genMultiChoiceGroup(dom) + brAfter;
                    break;
                }
            case 'cenarius-either-group':
                {
                    res = brBefore + this.genEitherGroup(dom) + brAfter;
                    break;
                }
            case 'cenarius-input-group':
                {
                    res = brBefore + this.genInputGroup(dom) + brAfter;
                    break;
                }
            default:
                {
                    alert('[CenariusFormError]: Unknown DOM name found (' + domName + ')[' + $(dom).length + ']: \n' + dom.outerHTML)
                    res = '__ERROR__';
                }
        }

        if (isSet(skip) && skip)
            return '';
        else
            return res;
    };

    static gen(forma, cenariusForm) {
        let mySG = new SummaryGenerator();

        const mainCol = $(cenariusForm).children()[0];
        const summary = mapJoin($(mainCol).children(), function(group) {
            return mySG.visitDomNode(group);
        });

        return $_$('p', {}, [summary]);
    };
}

class SQLSchemaGenerator {
    static genIDColumn(tableName) {
        return {
            name: 'id',
            sqlType: 'integer',
            notNull: true,
            autoIncrement: true,
            primaryKey: true
        };
    }

    constructor(forma, tableName) {
        this.forma = forma;
        this.mainTableName = identifierize(tableName);
        this.tables = [{
            tableName: tableName,
            fields: [SQLSchemaGenerator.genIDColumn()]
        }];
    }

    visitFormaNode(node, key, dest) {
        const sqlGenSelf = this;
        const next = node[key];
        const type = next._type;
        const parentTableName = dest.tableName;

        // console.log('sql gen: name=' + next._fieldID + ', type=' + type);
        switch (type) {
            case 'subobject':
                {
                    const soTableName = parentTableName +
                        '.' + identifierize(next._fieldID);
                    const soTable = {
                        tableName: soTableName,
                        fields: [
                            SQLSchemaGenerator.genIDColumn(), {
                                name: parentTableName + '_ref',
                                sqlType: 'integer',
                                notNull: true,
                                foreignRef: parentTableName
                            }
                        ]
                    }
                    this.tables.push(soTable);
                    dest = this.tables.last();
                }
            case 'object':
                {
                    _.each(Object.keys(next._properties), function(childKey) {
                        sqlGenSelf.visitFormaNode(next._properties, childKey, dest);
                    })
                    break;
                }
            case 'enum':
                {
                    const enumItems = next.hasOwnProperty('_enum') ?
                        next._enum : next._enum_multi;
                    _.each(Object.keys(enumItems), function(childKey) {
                        sqlGenSelf.visitFormaNode(enumItems, childKey, dest);
                    });
                    break;
                }
            case undefined:
                {
                    console.error('Undefined type');
                    console.error(JSON.stringify(next, null, 2));
                    break;
                }
            default:
                {
                    dest.fields.push({
                        name: next._fieldID,
                        sqlType: SQLTypeTable[next._type]
                    });
                }
        }
    }

    static stringify(tableData) {
        const bracket = (s) => {
            return '[' + s + ']';
        };
        const str = 'CREATE TABLE ' + bracket(tableData.tableName) + '\n' +
            '(\n' +
            mapJoin(tableData.fields, (fd) => {
                const fdStr =
                    '    ' +
                    bracket(fd.name) +
                    ' ' + fd.sqlType +
                    (fd.notNull === true ? ' NOT NULL' : '') +
                    (fd.autoIncrement === true ? ' IDENTITY(1,1)' : '') +
                    (fd.primaryKey === true ? ' PRIMARY KEY' : '') +
                    (typeof fd.foreignRef === 'string' ?
                        (' FOREIGN KEY REFERENCES ' + bracket(fd.foreignRef) + '(' +
                            bracket('id') + ')') : '');
                return fdStr;
            }, ', \n') +
            '\n);';

        return str;
    }

    gen() {
        const sqlgSelf = this;
        _.each(Object.keys(sqlgSelf.forma), function(key) {
            sqlgSelf.visitFormaNode(sqlgSelf.forma, key, sqlgSelf.tables[0]);
        })

        return mapJoin(this.tables, (td) => {
            return SQLSchemaGenerator.stringify(td);
        }, '\n');
    }
}



function isRawType(fNodeType) {
    return fNodeType === 'string' ||
        fNodeType === 'number' ||
        fNodeType === 'boolean';
}

function inferFNodeType(fNode, defaultType = 'string') {
    const objType = typeof fNode;
    if (objType === 'object') {
        if (fNode.hasOwnProperty('_type'))
            return fNode._type;

        if (fNode.hasOwnProperty('_enum') || fNode.hasOwnProperty('_enum_multi'))
            return 'enum';

        if (fNode.hasOwnProperty('_properties'))
            return 'object';
    }

    return defaultType;
}

function formCtrlUpdateCkbx(e) {
    const $this = $(this);
    const ckbx = $($this.parent().parent().siblings('input[type=checkbox]'));

    if ($this.is('input')) {
        setCheckbox(ckbx, $this.val().length > 0);
    } else if ($this.is('select')) {
        setCheckbox(ckbx, $this.val() !== config.defaultEnumOptionText);
    }
}

function updateAllWCkbxs() {
    $('.form-control').trigger('change');
}

function showSnackbar(text, timeout = 3000) {
    let sb = document.createElement('div');
    sb.setAttribute('class', 'snackbar show');
    sb.innerHTML = text;

    let parent = $('#bootstrap-overrides');
    parent.append(sb);

    setTimeout(() => {
        sb.setAttribute('class', 'snackbar')
        setTimeout(() => {
            sb.remove();
        }, timeout);
    }, timeout);
}

function setCheckbox(ckbx, val) {
    const $ckbx = $(ckbx);
    const checked = $ckbx.prop('checked');
    if ((val && !checked) || (checked && !val))
        $ckbx.trigger('click');
}



function mapJoin(obj, func, sep = '') {
    return _.map(obj, func).join(sep);
}

function isElement(o) {
    return (
        typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
        o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string"
    );
}

function $_$(tag, attr = {}, content = [], close = true) {
    let dom = document.createElement(tag);
    _.each(Object.getOwnPropertyNames(attr), (field) => {
        dom.setAttribute(field, attr[field]);
    });

    _.each(content, (c) => {
        if (!isElement(c)) {
            const cDoms = $.parseHTML(c);
            if (cDoms.length > 0) {
                _.each(cDoms, (cDom) => {
                    dom.appendChild(cDom)
                });
            } else {
                dom.appendChild(document.createTextNode(c));
            }
        } else {
            dom.appendChild(c);
        }
    });

    return dom;
}

function getNameFromKey(key) {
    switch (config.defaultTitle) {
        case 'key_titleize':
            {
                return titleize(key.replaceAll('_', ' '));
            }
        case 'key_lower_case':
            {
                return key.replace('_', ' ').toLowerCase();
            }
        case 'key_upper_case':
            {
                return key.replace('_', ' ').toUpperCase();
            }
        case 'key':
            {
                return key;
            }
        default:
            {
                return 'invalid_default_name_config';
            }
    }
}

function titleize(str) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt[0].toUpperCase() + txt.substring(1).toLowerCase();
    });
}

function identifierize(str) {
    return str.replaceAll(/[^a-zA-Z\d]+/, '_').toLowerCase().replace(/^[0-9]/, '_$&');
}

String.prototype.replaceAll = function(search, replacement) {
    return this.replace(new RegExp(search, 'g'), replacement);
};

Array.prototype.last = function() {
    return this[this.length - 1];
};

function descendAll(node, func) {
    //Depth first
    node.children().each(function() {
        descendAll($(this), func);
    });

    func(node);
}

function mergeStrProps(a, b, separater = ' ') {
    let res = {};
    Object.getOwnPropertyNames(a).forEach(function(fieldName) {
        res[fieldName] = a[fieldName];
    })

    Object.getOwnPropertyNames(b).forEach(function(fieldName) {
        if (res.hasOwnProperty(fieldName)) {
            res[fieldName] += separater + b[fieldName];
        } else {
            res[fieldName] = b[fieldName];
        }
    })

    return res;
}

function selectText(elt) {
    let doc = document,
        text = elt,
        range, selection;
    if (doc.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(text);
        range.select();
    } else if (window.getSelection) {
        selection = window.getSelection();
        range = document.createRange();
        range.selectNodeContents(text);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function copyToClipboard(elt) {
    selectText(elt);
    return document.execCommand('copy');
}

function isPositiveInt(str) {
    const n = Math.floor(Number(str));
    return String(n) === str && n >= 0;
}

function isInt(value) {
    var x;
    return isNaN(value) ? false : (x = parseFloat(value), (0 | x) === x);
}

function isSet(value) {
    return !(_.isUndefined(value) || _.isNull(value));
};

main(window, ((typeof jQuery !== 'undefined') ? jQuery : {
    fn: {}
}));

$(domReady);