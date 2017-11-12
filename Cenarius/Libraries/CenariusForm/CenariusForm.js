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
    defaultNumberStep: 0.01,
    autoLabelColon: '',
    autoLabelSpace: '',
    defaultEnumOptionText: '--',

    nCols: {
        object: '12',
        subobject: '12',
        enum: '6',
        complexEnum: '12',
        input: '6'
    },

    minSubobjectInstance: 1,

    maxLength: {
        float: '-1',
        integer: '-1',
        big_string: '2048',
        string: '512',
        boolean: '-1',
        date: '-1',
        label: '-1'
    }
};

const HtmlInputTypeTable = Object.freeze({
    float: 'number',
    integer: 'number',
    big_string: 'text',
    string: 'text',
    boolean: 'checkbox',
    date: 'date',
    label: 'label'
})

const SQLHintTable = Object.freeze({
    float: 'float',
    integer: 'integer',
    big_string: 'nvarchar',
    string: 'nvarchar',
    boolean: 'bit',
    date: 'date',

    // Any enum field references the enumOptions table using a FKey
    enum: 'int'
})

const SummaryStyleTable = Object.freeze({
    NoTitle: 'no_title',
    Exclude: 'exclude',
    BreakBefore: 'break_before',
    NoBreakBefore: 'no_break_before',
    BreakAfter: 'break_after',
    NoBreakAfter: 'no_break_after',
    BreakAftertitle: 'break_after_title',
    NoBreakAfterTitle: 'no_break_after_title',
})

const NoneIdentifierCharRegexStr = Object.freeze(/[^a-zA-Z\d\u4e00-\u9eff]+/);
const formCtrlUpdateEvents = Object.freeze('keyup change focus');
const enumOptionsAllowNewEntryStr = Object.freeze('::AllowNewEntry');

function domReady() {
    attachStaticHandlers();

    // Set initial state for checkboxes
    updateAllFields();
}

function main(global, $) {
    $.fn.cenarius = function(headingText, options) {
        const myFG = new FormGenerator(options.forma, options.formi);
        const formaDoms = myFG.genDoms();

        const mySqlGen = new SQLSchemaGenerator(myFG);

        const contentDoms = DomMaker.genContent(headingText, formaDoms);
        const ctrlDoms = DomMaker.genCtrlPanel(myFG, mySqlGen);
        const summaryModalDoms = DomMaker.genSummaryModal(myFG);
        const sqlModalDoms = DomMaker.genDebugModal(mySqlGen);

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
        this.fieldIDCounter = 0;
        this.subobjIDCounter = 0;
        this.forma = forma; // Form + schema data
        this.mainTableName = identifierize(String(formi.table_name));
        this.data = [];
        this.soMethods = {};
        this.enumOptions = [];

        this.resetDefaultChildrenType();
        this.resetDefaultNCols();
        this.resetComplexEnumMode();
    }

    genDoms() {
        const sgSelf = this;
        const doms = _.map(Object.keys(sgSelf.forma),
            function(topLvKey) {
                return sgSelf.visitFormaNode(sgSelf.forma, topLvKey, sgSelf.data);
            });

        return doms;
    }

    visitFormaNode(fNode, key, dNode) {
        const fgSelf = this;

        // Convert strings into a proper fNode
        const inferredType = inferFNodeType(fNode[key], fgSelf.currentDefaultChildrenType);
        // console.log(JSON.stringify(fNode[key], null, 2));
        // console.log('inferredType=' + inferredType);

        const fNext =
            typeof(fNode[key]) !== 'object' ?
            (fNode[key] = {
                title: fNode[key],
                type: inferredType
            }) :
            fNode[key];

        // Extract flags
        const name =
            fNext.hasOwnProperty('title') ? fNext.title :
            getNameFromKey(key);

        fNext.type = inferredType;

        // console.log('key: ' + key + ', name: ' + name + ', inferredType: ' + inferredType);
        // console.log('defaultChildrenType: ' + this.currentDefaultChildrenType);
        // console.log('content: ');
        // console.log(JSON.stringify(fNext, null, 2));

        const children =
            fNext.hasOwnProperty('properties') ? fNext.properties :
            fNext.hasOwnProperty('enum') ? fNext.enum : {};

        const defaultChildrenType =
            fNext.hasOwnProperty('default_children_type') ? fNext.default_children_type :
            (inferredType === 'enum' ? 'boolean' : 'string');

        const defaultNCols =
            fNext.hasOwnProperty('default_cols') ? fNext.default_cols :
            '';

        function sandwich(_dNode = dNode) {
            return _.map(Object.keys(children),
                (nextKey) => {
                    fgSelf.setDefaultChildrenType(defaultChildrenType);
                    fgSelf.setDefaultNCols(defaultNCols);

                    const resDom = fgSelf.visitFormaNode(children, nextKey, _dNode);

                    fgSelf.resetDefaultChildrenType();
                    fgSelf.resetDefaultNCols();

                    return resDom;
                }
            );
        };

        if (this.inComplexEnum &&
            (inferredType == 'object' ||
                inferredType == 'subobject' ||
                inferredType == 'enum')) {
            alert('Illigal forma node: inComplexEnum=true but encountered ' + inferredType);
            return undefined;
        }

        switch (inferredType) {
            case 'object':
                {
                    return fgSelf.genObj(fNext, key, name, sandwich, dNode);
                }
            case 'subobject':
                {
                    return fgSelf.genSubobj(fNext, key, name, sandwich, dNode);
                }
            case 'enum':
                {
                    return fgSelf.genEnum(fNext, key, name, sandwich, dNode);
                }
            default:
                {
                    return fgSelf.genField(fNext, inferredType, key, name, dNode);
                }
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

        //Not a field so do not increment this.fieldIDCounter
        const fieldID = key + '_grouping';

        const headingDoms = [name];
        if (fNode.hasOwnProperty('help_text'))
            headingDoms.push($_$('div', {
                class: 'alert alert-info'
            }, [fNode.help_text]))

        const sandwichDoms = sandwich(dNode);
        const bodyDoms =
            fNode.grouping === 'either' ?
            [this.genEitherGroup(fieldID, sandwichDoms)] :
            sandwichDoms;

        const nCols =
            fNode.hasOwnProperty('cols') ?
            fNode.cols : config.nCols.object;

        return DomMaker.genPanel(
            headingDoms,
            bodyDoms,
            nCols, {
                name: 'cenarius-object-group',
                summaryStyle: fNode.summary_style || ''
            }, {
                class: fNode.html_class
            }
        );
    };

    genSubobj(fNode, key, name, sandwich, dNode) {
        console.log('genSubobj(' + key + ')');
        const fgSelf = this;

        // Increase field ID to avoid duplicate SO names
        const fieldID = this.getNextSubobjID(key);
        fNode.fieldID = fieldID;
        const fidBeforeSandwich = Object.freeze(this.fieldIDCounter);

        const soDNode = {
            name: fieldID,
            sqlHint: 'subobject',
            instances: {}
        };
        dNode.push(soDNode);

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

        const makeSOI = () => {
            const keys = _.map(Object.keys(soDNode.instances), (k) => {
                return Number(k);
            });
            const idx = String(
                keys.length > 0 ?
                (keys.reduce((a, b) => {
                    return Math.max(a, b)
                }) + 1) : 1
            );
            const soID = fieldID + '-so-instance-' + idx;

            soDNode.instances[idx] = [];

            fgSelf.fieldIDCounter = fidBeforeSandwich;
            $(soTabHeaderDom).append(
                DomMaker.genTabRef(
                    soID,
                    '#' + idx));
            $(soTabContentDom).append(
                DomMaker.genTabPane(
                    soID,
                    sandwich(soDNode.instances[idx])));

            $(soTabHeaderDom).children().removeClass('active')
            $(soTabHeaderDom).children(':last-child').addClass('active');
            $(soTabContentDom).children().removeClass('active');
            $(soTabContentDom).children(':last-child').addClass('active in');

            updateAllFields();
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
            delete soDNode.instances[activeIdx];
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
        const panelHeadingFunc = (headingDoms) => {
            return DomMaker.genPanelHeading(headingDoms, 'overflow: hidden');
        };

        const addDelBtns =
            $_$('div', {
                style: 'float: right; '
            }, [
                delTabBtn,
                newTabBtn
            ]);

        const headingDoms = [
            $_$('div', {
                class: 'col-md-10'
            }, name),
            $_$('div', {
                class: 'col-md-2',
            }, [addDelBtns])
        ];

        if (fNode.hasOwnProperty('help_text')) {
            headingDoms.push(
                $_$('div', {
                    class: 'alert alert-info col-md-12',
                    style: ''
                }, [fNode.help_text]));
        }

        const nCols =
            fNode.hasOwnProperty('cols') ?
            fNode.cols : config.nCols.subobject;

        return DomMaker.genPanel(
            headingDoms, [soTabHeaderDom, soTabContentDom],
            nCols, {
                name: 'cenarius-subobject-group',
                summaryStyle: fNode.summary_style || ''
            }, {
                class: fNode.html_class
            }, panelHeadingFunc);
    };

    genEnum(fNode, key, name, sandwich, dNode) {
        const fgSelf = this;
        console.log('genEnum(' + key + ')');

        const fieldID = this.getNextFieldID(key);
        fNode.fieldID = fieldID;

        let enumData;
        let simpleEnum = true;

        // Determine whether enum is a complex one
        enumData = fNode.enum;
        _.each(enumData, (item) => {
            const requiresInput =
                typeof item === 'object' &&
                item.hasOwnProperty('require_input');
            simpleEnum &= !requiresInput;
            if (requiresInput) {
                console.log('enum is complex because item ' + item.title + ' requires input');
                // console.log(item);
            }
        });

        const extraHtmlClass =
            fNode.hasOwnProperty('html_class') ?
            fNode.html_class : '';
        const nCols = fNode.hasOwnProperty('cols') ? fNode.cols :
            this.currentDefaultNCols !== '' ? this.currentDefaultNCols :
            simpleEnum ? config.nCols.enum :
            config.nCols.complexEnum;

        const needCheckbox =
            this.inComplexEnum || (fNode.force_checkbox === true);

        // Default value
        const defaultValue = fNode.hasOwnProperty('default_value') ? fNode.default_value : 0;

        if (simpleEnum) {
            const selectOptions = [];

            // Prepend null option if checkbox will be added
            if (needCheckbox)
                selectOptions.push($_$('option', {}, [config.defaultEnumOptionText]));

            fgSelf.enumOptions.push({
                fieldID: fieldID + enumOptionsAllowNewEntryStr,
                value: false
            });
            _.each(Object.keys(enumData), (enumKey) => {
                const item = enumData[enumKey];
                const optionName = typeof item === 'object' ? item.title : String(item);

                selectOptions.push($_$('option', {}, [optionName]));
                fgSelf.enumOptions.push({
                    fieldID: fieldID,
                    value: optionName
                });
            })

            const selectDom = $_$('select', {
                class: 'selectpicker form-control',
                id: fieldID,
                name: fieldID,
                'data-live-search': true,
                defaultValue: defaultValue
            }, selectOptions);
            $(selectDom).on(formCtrlUpdateEvents, formCtrlUpdateCkbx);

            // The value of 'true' is required - 'undefined' only works sometimes
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
                    this.inComplexEnum,
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

            // Create data node for containing the result string
            const myDNode = {
                name: fieldID,
                sqlHint: 'enum'
            };
            dNode.push(myDNode);

            // Initial value is set by trigger in domReady()
            $(selectDom).on('change', function() {
                myDNode.value = $(this).val();
            });

            return $_$('div', {
                name: 'cenarius-input-group',
                class: 'col-md-' + nCols + ' ' + extraHtmlClass,
                summaryStyle: fNode.summary_style || ''
            }, [
                $_$('div', {
                    class: 'input-group'
                }, needCheckbox ? ckbxWrappedDoms : inputDoms)
            ]);
        } else {
            const choiceTypeIcon =
                $_$('span', {
                    class: 'pull-right glyphicon glyphicon-record',
                    name: 'choice-type-icon'
                });

            const myDNode = {
                name: fieldID,
                sqlHint: 'enum'
            };
            dNode.push(myDNode);

            // Allow new values because some fields require input
            fgSelf.enumOptions.push({
                fieldID: fieldID + enumOptionsAllowNewEntryStr,
                value: true
            });

            this.setComplexEnumMode(fieldID);
            const dom =
                DomMaker.genPanel([name, choiceTypeIcon],
                    sandwich(myDNode),
                    nCols, {
                        name: 'cenarius-single-choice-group',
                        id: fieldID,
                        summaryStyle: fNode.summary_style || ''
                    }, {
                        class: extraHtmlClass
                    }
                );
            this.resetComplexEnumMode();
            return dom;
        }
    };

    genField(fNode, type, key, name, dNode) {
        console.log('genField(' + type + ', ' + key + ', \"' + name + '\")');

        const fieldID = isPositiveInt(key) ?
            this.getNextFieldID(name) : this.getNextFieldID(key);
        fNode.fieldID = fieldID;

        // Complex enums simply fill parent dNode.value
        const myDNode = this.inComplexEnum ? dNode : {
            name: fieldID,
            sqlHint: SQLHintTable[fNode.type]
        };

        // Type related flags
        const htmlInputType = HtmlInputTypeTable[type];
        const isTextArea = type === 'big_string';
        const inputTag = isTextArea ? 'textarea' : 'input';

        // Value related flags
        let defaultValue = '';
        if (fNode.hasOwnProperty('default_value')) {
            defaultValue = fNode.default_value;
        } else {
            if (htmlInputType === 'number') {
                defaultValue = '0';
            } else if (htmlInputType === 'date') {
                defaultValue = (new Date()).toISOString().slice(0, 10);
            }
        }

        // Number flags
        const numStep = type === 'integer' ? 1 :
            (fNode.hasOwnProperty('number_step') ?
                fNode.number_step : config.defaultNumberStep);
        const numMin = fNode.hasOwnProperty('min') ?
            fNode.min : '';
        const numMax = fNode.hasOwnProperty('max') ?
            fNode.max : '';

        // String flags
        const maxStringLength =
            Math.min(4000, isInt(fNode.max_string_length) ?
                fNode.max_string_length : config.maxLength[type]);
        // 4k is Sql nvarchar max len

        if (htmlInputType === 'text')
            fNode.maxStringLength = maxStringLength;

        const textAlignment = isTextArea ?
            '' : 'text-align: right; ';
        const textAreaRows = isTextArea ?
            (fNode.hasOwnProperty('textarea_rows') ?
                fNode.textarea_rows : '5') : '';

        const fieldStyle = textAlignment;
        const fieldName = name + config.autoLabelColon + config.autoLabelSpace;
        const needCheckbox =
            this.inComplexEnum || fNode.force_checkbox === true;
        const endingSpan = (() => {
            if (fNode.hasOwnProperty('ending')) {
                return $_$('span', {
                    class: 'input-group-addon cenarius-input-tag'
                }, [fNode.ending]);
            } else if (type === 'big_string') {
                return $_$('span', {
                    class: 'input-group-addon cenarius-input-tag',
                    name: 'textarea-counter'
                }, [defaultValue.length + '<br>------<br>' + maxStringLength]);
            } else {
                return undefined;
            }
        })();
        const inComplexEnum = Object.freeze(this.inComplexEnum);

        // Generate the field html which might include an input addon and an ending
        const inputDoms =
            (() => {
                switch (htmlInputType) {
                    case 'space':
                        {
                            return $_$('div', {
                                class: 'col-md-offset-' + nCols + ' ' + extraHtmlClass,
                                style: 'height: 46px !important',
                                summaryStyle: 'exclude'
                            });
                        }
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
                                class: inComplexEnum ? 'single-choice-checkbox' : '',
                                autocomplete: 'off',
                            }

                            const ckbxInputDom = $_$('input', ckbxProps);
                            if (defaultValue === true)
                                $(ckbxInputDom).attr('checked', true);

                            if (inComplexEnum)
                                $(ckbxInputDom).on('change',
                                    updateComplexSingleChoiceCkbx);

                            // Value should be title of field if this 
                            // checkbox is under a Complex enum
                            // but only when checkbox is checked
                            $(ckbxInputDom).on('change', function() {
                                if (inComplexEnum) {
                                    if ($(this).is(':checked')) {
                                        myDNode.value = name;
                                    }
                                } else {
                                    myDNode.value = $(this).is(':checked');
                                }
                            });

                            const chbkxDispDom =
                                $_$('label', {
                                    readonly: true,
                                    class: 'btn btn-default cenarius-ckbx-btn checkbox-displayer'
                                }, [
                                    $_$('span', {
                                        class: 'glyphicon glyphicon-ok cenarius-chbkx-icon'
                                    })
                                ]);

                            const ckbxBtnDom =
                                $_$('label', {
                                    class: 'btn btn-default cenarius-ckbx-lbl'
                                }, [name]);

                            $(ckbxBtnDom).on('click', function() {
                                $(ckbxInputDom).attr('checked', !$(ckbxInputDom).attr('checked'));
                                $(ckbxInputDom).trigger('change');
                            });

                            if (inComplexEnum) {
                                this.enumOptions.push({
                                    fieldID: inComplexEnum,
                                    value: name
                                });
                            }

                            const ckbxDoms =
                                [
                                    ckbxInputDom,
                                    chbkxDispDom,
                                    ckbxBtnDom
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
                            const $regularInputDom = $(regularInputDom);

                            if (inputTag === 'textarea') {
                                // Textarea auto resize
                                // Credits to https://stackoverflow.com/questions/454202/creating-a-textarea-with-auto-resize
                                regularInputDom.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden;');
                                $regularInputDom.on('input', function() {
                                    this.style.height = 'auto';
                                    this.style.height = (this.scrollHeight) + 'px';
                                });

                                // Textarea auto char count
                                $regularInputDom.on(formCtrlUpdateEvents, function() {
                                    const valLen = $(this).val().length;
                                    const counterSpan = $(this).siblings('span[name=textarea-counter]');
                                    const oldCounter = $(counterSpan).html();
                                    $(counterSpan).html(valLen + oldCounter.substring(oldCounter.indexOf('<br>')));
                                });
                            }

                            $regularInputDom.on(formCtrlUpdateEvents, formCtrlUpdateCkbx);

                            $regularInputDom.on('change', function(e) {
                                const $inputDomSelf = $(this);
                                if (inComplexEnum) {
                                    // In a single complex enum the emptying of a field 
                                    // should not affect the data node value because
                                    // another option would be setting it anyway
                                    if ($inputDomSelf.val().length == 0)
                                        return;
                                }
                                myDNode.value = $inputDomSelf.val();
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
                                const ckbxWrappedDoms =
                                    DomMaker.genCheckboxWrapper(
                                        fieldID,
                                        inComplexEnum,
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
                            console.error('Fatal error: unknown field type: ' + type + '(htmlInputType: ' + htmlInputType + ')');
                            return [$_$('b', {}, [$_$('font', {
                                color: 'red',
                                size: '5em'
                            }, ['[CenariusFormError] Unknown field type: ' + type])])];
                        }
                }
            })();

        const nCols = fNode.hasOwnProperty('cols') ? fNode.cols :
            this.currentDefaultNCols !== '' ? this.currentDefaultNCols :
            config.nCols.input;
        const extraHtmlClass = fNode.hasOwnProperty('html_class') ?
            fNode.html_class : '';

        // Complex enums simply fill parent dNode.value
        if (!this.inComplexEnum)
            dNode.push(myDNode);

        return $_$('div', {
            name: 'cenarius-input-group',
            class: 'col-md-' + nCols + ' ' + extraHtmlClass,
            summaryStyle: fNode.summary_style || '',
        }, [
            $_$('div', {
                    class: 'input-group',
                    style: 'width: 100% !important'
                },
                inputDoms)
        ]);
    };

    resetDefaultChildrenType() {
        // console.log('resetDefaultChildrenType()');
        this.setDefaultChildrenType(config.defaultChildrenType);
    }

    setDefaultChildrenType(type) {
        // console.log('setDefaultChildrenType(' + type + ')');
        this.currentDefaultChildrenType = type;
    }

    resetDefaultNCols() {
        this.setDefaultNCols(12);
    }

    setDefaultNCols(nCols) {
        this.currentDefaultNCols = nCols;
    }

    resetComplexEnumMode() {
        this.setComplexEnumMode('');
        // console.log('resetComplexEnumMode(' + this.inComplexEnum + ')');
    }

    setComplexEnumMode(enumID) {
        this.inComplexEnum = enumID;
        // console.log('setComplexEnumMode(' + this.inComplexEnum + ')');
    }

    getNextFieldID(key) {
        const id = identifierize(key + '_f' + this.fieldIDCounter);
        this.fieldIDCounter++;
        return id;
    }

    getNextSubobjID(key) {
        const id = identifierize(key + '_s' + this.subobjIDCounter);
        this.subobjIDCounter++;
        return id;
    }
}

class SQLSchemaGenerator {
    static genIDColumn(tableName) {
        return {
            name: 'id',
            sqlHint: 'integer',
            notNull: true,
            autoIncrement: true,
            primaryKey: true
        };
    }

    constructor(formGen) {
        this.enumOptions = formGen.enumOptions;
        this.enumOptionsTableName = formGen.mainTableName + '.enum_options';
        this.tables = [{
            name: formGen.mainTableName,
            columns: [SQLSchemaGenerator.genIDColumn()]
        }];

        const sqlgSelf = this;

        // Gen tables based on form schema 
        _.each(Object.keys(formGen.forma), function(key) {
            sqlgSelf.visitFormaNode(formGen.forma, key, sqlgSelf.tables[0]);
        })

        // Create auxiliary EnumOptions table
        this.genEnumOptionsTable();
    }

    visitFormaNode(node, key, dest) {
        const sqlGenSelf = this;
        const next = node[key];
        const type = inferFNodeType(next);
        const parentTableName = dest.name;

        // console.log('sql gen: name=' + next.fieldID + ', type=' + type);
        switch (type) {
            case 'subobject':
                {
                    const soTableName = parentTableName +
                        '.' + identifierize(next.fieldID);
                    const soTable = {
                        name: soTableName,
                        columns: [
                            SQLSchemaGenerator.genIDColumn(), {
                                name: parentTableName + '_ref',
                                sqlHint: 'integer',
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
                    _.each(Object.keys(next.properties), function(childKey) {
                        sqlGenSelf.visitFormaNode(next.properties, childKey, dest);
                    })
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
                    const newCol = {
                        name: next.fieldID,
                        sqlHint: SQLHintTable[next.type]
                    }

                    if (next.type === 'enum')
                        newCol.foreignRef = this.enumOptionsTableName;
                    if (next.hasOwnProperty('maxStringLength'))
                        newCol.maxLen = next.maxStringLength;

                    dest.columns.push(newCol);
                }
        }
    }

    genEnumOptionsTable() {
        const sqlgSelf = this;

        const eoTable = {
            name: sqlgSelf.enumOptionsTableName,
            columns: [
                SQLSchemaGenerator.genIDColumn(), {
                    name: 'fieldID',
                    sqlHint: SQLHintTable['string'],
                    maxLen: 512
                }, {
                    name: 'value',
                    sqlHint: SQLHintTable['string'],
                    maxLen: 1024
                }
            ],
            rows: []
        }

        _.each(sqlgSelf.enumOptions, (eo) => {
            eoTable.rows.push(eo);
        });

        // Put this at the beginning to respect
        // FKey ordering
        this.tables.unshift(eoTable);
    };

    static stringify(tableData) {
        const bracket = (s) => {
            return '[' + s + ']';
        };
        const str = 'CREATE TABLE ' + bracket(tableData.name) + '\n' +
            '(\n' +
            mapJoin(tableData.columns, (fd) => {
                const fdStr =
                    '    ' +
                    bracket(fd.name) +
                    ' ' + fd.sqlHint +
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

    getSchema() {
        return mapJoin(this.tables, (td) => {
            return SQLSchemaGenerator.stringify(td);
        }, '\n');
    };
}

class DomMaker {
    static genCheckboxWrapper(
        fieldID,
        inComplexEnum,
        fieldDoms,
        ckbxDomOnChange = () => {}) {
        const checkboxID = fieldID + '_wckbx';
        const ckbxDom =
            $_$('input', {
                type: 'checkbox',
                id: checkboxID,
                name: checkboxID,
                class: 'wrapper-checkbox ' + (inComplexEnum ? 'single-choice-checkbox' : ''),
                autocomplete: 'off'
            });

        if (inComplexEnum)
            $(ckbxDom).on('change', updateComplexSingleChoiceCkbx);

        $(ckbxDom).on('change', ckbxDomOnChange);

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
                method: 'post'
            }, [$_$('div', {
                class: 'col-md-12',
                style: 'padding-bottom: 10px'
            }, formaDoms)])
        ]);
    };

    static genCtrlPanel(formGen, sqlGen) {
        const resetFieldsBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-danger btn-lg reset-btn',
            }, [
                $_$('span', {
                    class: 'glyphicon glyphicon-trash'
                }), [' Clear Fields']
            ]);
        $(resetFieldsBtn).on('click',
            function(e) {
                if (confirm('Are you sure you want to reset (clear) all fields?')) {
                    // Spawn new SOI first, then clear individual fields
                    _.each(Object.keys(formGen.soMethods), (somKey) => {
                        const som = formGen.soMethods[somKey];
                        som.clearSOI();
                        som.genMinSOI();
                    });

                    $('input').each(function() {
                        const $this = $(this);
                        const propType = $this.prop('type');
                        if (propType === 'checkbox') {
                            setCheckbox($this, false);
                        } else if (propType === 'number') {
                            $this.prop('value', 0);
                        } else if (propType === 'date') {
                            $this.prop('value', (new Date()).toISOString().slice(0, 10));
                        } else {
                            $this.prop('value', '');
                        }
                        $this.trigger('change');
                    })

                    $('textarea').each(function() {
                        const $this = $(this);
                        $this.prop('value', '');
                        $this.trigger('change');
                    })

                    _.each($('select').children(), (sc) => {
                        sc.removeAttribute('selected');
                    });
                    $($('select').children()[0]).attr('selected', true);
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
                    class: 'glyphicon glyphicon-wrench'
                }), [' Debug']
            ]);
        $(genDebugBtn).on('click', function(e) {
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
                DomMaker.genTabRef('di-formgen', 'FormGen')
            );
            diHeaderDom.append(
                DomMaker.genTabRef('di-data', 'Data')
            );
            const diContentDom =
                $_$('div', {
                    class: 'tab-content col-md-12',
                    name: 'debuginfo-tabcontent'
                });

            diContentDom.append(
                DomMaker.genTabPane('di-schema', [
                    $_$('pre', {
                        style: 'white-space: pre-wrap'
                    }, [
                        sqlGen.getSchema()
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
                DomMaker.genTabPane('di-formgen', [
                    $_$('pre', {
                        style: 'white-space: pre-wrap'
                    }, [
                        JSON.stringify(formGen, null, 2)
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

    static genSummaryModal(formGen) {
        const submitBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-primary',
                id: 'submit_btn',
                'data-dismiss': 'modal'
            }, ['Submit']);
        $(submitBtn).on('click',
            function(e) {
                var copy = $.extend(true, {}, e);
                e.stopPropagation();

                const loader = $_$('div', {
                    class: 'loader'
                });
                $('#bootstrap-overrides').append(loader);

                const timeout = 30000;
                const sb = showSnackbar("Submitting... (<30s)", timeout);

                postDataToServer(
                    '/Home/Submit', {
                        mainTableName: formGen.mainTableName,
                        data: formGen.data
                    },
                    timeout,
                    function() {
                        loader.remove();
                        $(sb).fadeOut();
                        $(copy.target.parentNode).trigger(copy);
                    });
            });

        const copyBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-success'
            }, ['Copy']);

        $(copyBtn).on('click',
            function(e) {
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

    static genDebugModal(sqlGen) {
        const makeBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-danger',
                style: 'margin: 3px; float:right'
            }, ['Make It']);
        $(makeBtn).on('click',
            function(e) {
                if (confirm("About to create tables for this forma. Only proceed if you know what you're doing!\n\n" +
                        "即將生成資料庫架構, 不懂這是什麼意思的話請按取消!")) {
                    const loader = $_$('div', {
                        class: 'loader'
                    });
                    $('#bootstrap-overrides').append(loader);

                    const timeout = 60000;
                    const sb = showSnackbar('This could take a while (<60s)...', timeout);

                    postDataToServer(
                        '/Home/MakeTables',
                        sqlGen.tables,
                        timeout,
                        function(res) {
                            $(sb).fadeOut();
                            loader.remove();
                        },
                        function(res) {
                            if (res.success === true) {
                                showSnackbar('Tables have been initialized!');
                            } else {
                                alert('Initialization failed:\n' + res.msg);
                            }
                        }
                    );
                }
            });

        const copyBtn =
            $_$('button', {
                type: 'button',
                class: 'btn btn-success',
                style: 'margin: 3px; float:right'
            }, ['Copy']);
        $(copyBtn).on('click',
            function(e) {
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
                        copyBtn,
                        makeBtn
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
    constructor() {

    };

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

        const ssStr = $(parent).attr('summaryStyle') || '';
        const noTitle = ssStr.hasSummaryStyle(SummaryStyleTable.NoTitle);
        const noBreakAfterTitle = ssStr.hasSummaryStyle(SummaryStyleTable.NoBreakAfterTitle);
        const noBreakAfter = ssStr.hasSummaryStyle(SummaryStyleTable.NoBreakAfter);

        let str = noTitle ? '' :
            (name + (noBreakAfterTitle ? '... ' : '<br>'));

        const subdoms = $(body).children();
        for (let i = 0; i < subdoms.length; i++) {
            str += sgSelf.visitDomNode(subdoms[i]);
        }
        str += noBreakAfter ? ' ' : '<br>';

        return str;
    };

    genSubobjectGroup(parent) {
        const sgSelf = this;
        const panelHeading = $(parent).children('.panel').children('.panel-heading')
            .children(':first-child');
        const name = this.getPlainText(panelHeading);
        const tabHeaders = $(parent).children('.panel')
            .children('.panel-body').children('ul[name=subobject-tabheaders]');
        const tabContent = $(parent).children('.panel')
            .children('.panel-body').children('div[name=subobject-tabcontent]');

        const ssStr = $(parent).attr('summaryStyle') || '';
        const noTitle = ssStr.hasSummaryStyle(SummaryStyleTable.NoTitle);
        const noBreakAfterTitle = ssStr.hasSummaryStyle(SummaryStyleTable.NoBreakAfterTitle);
        const noBreakAfter = ssStr.hasSummaryStyle(SummaryStyleTable.NoBreakAfter);

        let str = (noTitle ? '' : name) +
            '(#)' +
            (noBreakAfterTitle ? '... ' : '<br>');

        str += mapJoin(tabHeaders.children(),
            function(tabHeader) {
                const tabName = sgSelf.getPlainText($(tabHeader));
                let tabHref = $(tabHeader).children('a')[0].getAttribute('href');
                const tabID = tabHref.substring(tabHref.lastIndexOf('#'));
                const tabBody = $(tabContent).children(tabID);

                const tabBodyStr = mapJoin($(tabBody).children(), function(tabBodyElt) {
                    return sgSelf.visitDomNode(tabBodyElt);
                });

                return tabName + ':<br>' + tabBodyStr + '<br><br>';
            }, '<br>');

        str += noBreakAfter ? ' ' : '<br>';

        return str;
    };

    genEitherGroup(parent) {
        const sgSelf = this;
        const activeTab = $(parent).children('div[name=cenarius-either-group-tabcontent]')
            .children('.tab-pane.active')
        const activeTabRef = $(parent).children('ul[name=cenarius-either-group-tabheaders]')
            .children('li.active');
        const activeTabName = this.getPlainText(activeTabRef);

        const ssStr = $(parent).attr('summaryStyle') || '';
        const noTitle = ssStr.hasSummaryStyle(SummaryStyleTable.NoTitle);
        const noBreakAfterTitle = ssStr.hasSummaryStyle(SummaryStyleTable.NoBreakAfterTitle);
        const noBreakAfter = ssStr.hasSummaryStyle(SummaryStyleTable.NoBreakAfter);

        let str = (noTitle ? activeTabName : '') +
            (noBreakAfterTitle ? '' : '<Br>');

        const tabContent = $(activeTab).children();
        for (let i = 0; i < tabContent.length; i++) {
            str += sgSelf.visitDomNode(tabContent[i]);
        }
        str += (noBreakAfter ? '' : '<br>');

        return str;
    };

    genSingleChoiceGroup(parent) {
        const sgSelf = this;
        const panelHeading = $(parent).children('.panel').children('.panel-heading');
        const ckbx = $(parent).children('.panel').children('.panel-body')
            .find('div[name=cenarius-input-group] > div.input-group > input[type=checkbox]:checked');

        const ssStr = $(parent).attr('summaryStyle') || '';
        const noTitle = ssStr.hasSummaryStyle(SummaryStyleTable.NoTitle);
        const breakBefore = ssStr.hasSummaryStyle(SummaryStyleTable.BreakBefore);
        const breakAfterTitle = ssStr.hasSummaryStyle(SummaryStyleTable.BreakAfterTitle);
        const breakAfter = ssStr.hasSummaryStyle(SummaryStyleTable.BreakAfter);

        const title = noTitle ? '' : (this.getPlainText(panelHeading) + ': ');

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

        return (breakBefore ? '<br>' : '') +
            title +
            (breakAfterTitle ? '<br>' : '') +
            val + '. ' +
            (breakAfter ? '<br>' : '');
    };

    genInputGroup(parent) {
        const sgSelf = this;
        const $body = $($(parent).children('.input-group'));

        const $selectElt = $($body.children('select'));
        const $ckbxElt = $($body.children('input[type=checkbox]'));
        const $cbkxWrapper = $($body.children('.cenarius-checkbox-wrapper'));
        const $alertElt = $($body.children('div.alert'));
        const $textareaElt = $($body.children('textarea'));

        const ssStr = $(parent).attr('summaryStyle') || '';
        const noTitle = ssStr.hasSummaryStyle(SummaryStyleTable.NoTitle);
        const breakBefore = ssStr.hasSummaryStyle(SummaryStyleTable.BreakBefore);
        const breakAfterTitle = ssStr.hasSummaryStyle(SummaryStyleTable.BreakAfterTitle);
        const breakAfter = ssStr.hasSummaryStyle(SummaryStyleTable.BreakAfter);

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
            if ($ckbxElt.attr('checked')) {
                if (eltExists($cbkxWrapper)) {
                    const $wrapperSpan = $cbkxWrapper.children('span');
                    title = $wrapperSpan.children('span.input-group-addon').text();
                    val = $wrapperSpan.children('input').val();
                } else {
                    title = $body.children('.cenarius-ckbx-lbl').text();
                    val = 'yes';
                }
            } else {
                return '';
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

        return (breakBefore ? '<br>' : '') +
            (noTitle ? '' : (title + ': ')) +
            (breakAfterTitle ? '<br>' : '') +
            val +
            ending +
            (addPeriod ? '. ' : '') +
            (breakAfter ? '<br>' : '');
    };

    visitDomNode(dom) {
        const $dom = $(dom);

        const ssStr = $dom.attr('summaryStyle') || '';
        const exclude = ssStr.hasSummaryStyle(SummaryStyleTable.Exclude);
        const brBefore = ssStr.hasSummaryStyle(SummaryStyleTable.BreakBefore) ?
            '<br>' : '';
        const brAfter = ssStr.hasSummaryStyle(SummaryStyleTable.BreakAfter) ?
            '<br>' : '';

        let res = '';

        const domName = $dom.attr('name');
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

        if (exclude)
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


function postDataToServer(
    url,
    data,
    timeout = 5000,
    completeFunc = () => {},
    succFunc = function(response) {
        if (response.success === true) {
            showSnackbar('Submit OK!\n上傳成功');
        } else {
            alert('Submit failed\n上傳失敗\n\nReason: ' + response.msg);
        }
    },
    errorFunc = function(response, status) {
        if (status === 'timeout') {
            alert('Server timedout (' + timeout + 'ms)　- Please try again in a minute\n' +
                '伺服器逾時，請稍後再重試');
        } else {
            alert('Error\n錯誤\n\n' + response.error);
            console.error('postDataToServer() got an error:');
            console.error(response);
        }
    }) {
    console.log('postDataToServer(' + url + ', ' + timeout + ')　');

    $.ajax({
        url: url,
        type: 'POST',
        data: JSON.stringify({
            PostData: JSON.stringify(data)
        }),
        processData: false,
        dataType: 'json',
        contentType: 'application/json',
        timeout: timeout,
        complete: completeFunc,
        error: errorFunc,
        success: succFunc
    });
}

function isRawType(fNodeType) {
    return fNodeType === 'string' ||
        fNodeType === 'number' ||
        fNodeType === 'boolean';
}

function inferFNodeType(fNode, defaultType = 'string') {
    const objType = typeof fNode;

    if (objType === 'object') {
        if (fNode.hasOwnProperty('type'))
            return fNode.type;

        if (fNode.hasOwnProperty('require_input'))
            return fNode.require_input;

        if (fNode.hasOwnProperty('enum'))
            return 'enum';

        if (fNode.hasOwnProperty('properties'))
            return 'object';
    }

    // When objType is a raw type (string, number, boolean)
    // defaultType takes dominance
    return defaultType;
}

function attachStaticHandlers(domRoot = document) {
    const $domRoot = $(domRoot);

    // Fix button stuck in focus when alert shows up
    $domRoot.find('.btn').on('click', function(event) {
        $(this).blur();
    });
}

function updateComplexSingleChoiceCkbx(e) {
    const $currentCkbx = $(this);
    if ($currentCkbx.attr('checked')) {
        $currentCkbx.parent().parent().siblings().each(
            function() {
                const $otherField = $(this);
                $otherField.children('div').children('input[type=checkbox]').each(function() {
                    if ($(this).attr('checked')) {
                        setCheckbox(this, false);
                    }
                });
            });
    }
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

function updateAllFields() {
    $('.form-control').trigger('change');
    $('input[type=checkbox]:not(.wrapper-checkbox)').trigger('change');
}

function showSnackbar(text, timeout = 1500, fadeSpeed = 500) {
    const sb = document.createElement('div');
    sb.setAttribute('class', 'snackbar');
    sb.innerHTML = text;

    const $sb = $(sb);
    $sb.hide();

    const parent = $('#bootstrap-overrides');
    parent.append(sb);

    $sb.fadeIn(fadeSpeed, () => {
        setTimeout(() => {
            $sb.fadeOut(fadeSpeed, () => {
                $sb.remove()
            });
        }, timeout);
    });

    return sb;
}

function setCheckbox(ckbx, val) {
    const $ckbx = $(ckbx);
    const checked = $ckbx.attr('checked');
    if ((val && !checked) || (checked && !val)) {
        $ckbx.attr('checked', val);
        $ckbx.trigger('change');
    }
}



function mapJoin(obj, func, sep = '') {
    return _.map(obj, func).join(sep);
}

function isElement(o) {
    return (
        typeof HTMLElement === 'object' ? o instanceof HTMLElement : //DOM2
        o && typeof o === 'object' && o !== null && o.nodeType === 1 && typeof o.nodeName === 'string'
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

const NonAlphaNumeric = new RegExp('[^a-zA-Z0-9]', 'g');

function titleize(str) {
    let capNext = true;
    let newStr = '';

    for (let i = 0; i < str.length; i++) {
        let c = str.charAt(i);
        if (c.match(NonAlphaNumeric) !== null) {
            capNext = true;
        } else {
            if (capNext) {
                c = c.toUpperCase();
                capNext = false;
            }
        }

        newStr += c;
    }

    return newStr;
}

function identifierize(str) {
    return str.replaceAll(NoneIdentifierCharRegexStr, '_').toLowerCase().replace(/^[0-9]/, '_$&');
}

String.prototype.replaceAll = function(search, replacement) {
    return this.replace(new RegExp(search, 'gu'), replacement);
};

String.prototype.hasSummaryStyle = function(styleToken) {
    return this.toLowerCase().split(' ').includes(styleToken);
}

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