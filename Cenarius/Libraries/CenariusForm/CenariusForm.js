/* 
        A library that reads Cenarius-flavoured JSON and produces:
            1. The web form as described
            2. The SQL table schema 
            
        Author: Joy Yeh
        Inspired by Joshfire's JsonForms
        */
'use strict';

var config = {
    defaultType: 'string',
    inferObjectFromProps: true,
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
const _space = '&nbsp;';
const nullStm = () => {};
let myForma = '';

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
    date: 'date',
    // label: 'nvarchar' // Label should not be stored -- unless spec changes
}

class FormGenerator {
    constructor() {
        this.fieldID = 0;
        this.resetDefaultType();
        this.resetDefaultNCols();
        this.unsetForceCheckbox();
    }

    resetDefaultType() {
        console.log('resetDefaultType()');
        this.setDefaultType(config.defaultType);
    }

    setDefaultType(type) {
        console.log('setDefaultType(' + type + ')');
        this.currentDefaultType = type;
    }

    resetDefaultNCols() {
        console.log('resetDefaultNCols()');
        this.setDefaultNCols(12);
    }

    setDefaultNCols(nCols) {
        console.log('setDefaultNCols(' + nCols + ')');
        this.currentDefaultNCols = nCols;
    }

    unsetForceCheckbox() {
        console.log('unsetForceCheckbox()');
        this.forceCheckbox = 'none';
    }

    setForceCheckbox(isMultiChoice) {
        console.log('setForceCheckbox()');
        this.forceCheckbox = isMultiChoice ? 'multi' : 'single';
    }

    getNextID(key) {
        const id = key + '_f' + this.fieldID;
        this.fieldID++;
        return id;
    }

    genEitherGroup(fieldID, bodyDoms) {
        // Generate sandwich content and separate them
        let pages = [];
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

    genObj(node, key, name, sandwich) {
        console.log('genObj()');

        const extraHtmlClass = node.hasOwnProperty('_html_class') ?
            node._html_class : '';
        const nCols = node.hasOwnProperty('_cols') ?
            node._cols : config.nCols.object;
        const fieldID = key + '_grouping'; //Not a field so do not increment this.fieldID
        const needTabs = node.hasOwnProperty('_grouping') && node._grouping === 'either';
        const excludeFromSummary = node.hasOwnProperty('_exclude_from_summary') ? node._exclude_from_summary : undefined;
        const summaryBreakStyle = node.hasOwnProperty('_summary_break_style') ? node._summary_break_style : undefined;

        let ogProps = {
            name: 'cenarius-object-group'
        };
        if (isSet(excludeFromSummary))
            ogProps.excludeFromSummary = excludeFromSummary;
        if (isSet(summaryBreakStyle))
            ogProps.summaryBreakStyle = summaryBreakStyle;

        let headingDoms = [name];
        if (node.hasOwnProperty('_help_text'))
            headingDoms.push($_$('div', {
                class: 'alert alert-info'
            }, [node._help_text]))

        const bodyDoms = needTabs ? [this.genEitherGroup(fieldID, sandwich())] : sandwich();

        return DomMaker.genPanel(headingDoms, bodyDoms,
            nCols, ogProps, {
                class: extraHtmlClass
            }
        );
    };

    genSubobj(node, key, name, sandwich) {
        console.log('genSubobj()');

        // Html class
        const extraHtmlClass = node.hasOwnProperty('_html_class') ?
            node._html_class : '';
        const nCols = node.hasOwnProperty('_cols') ?
            node._cols : config.nCols.subobject;
        const fieldID = this.getNextID(key + '_subobject');
        const excludeFromSummary = node.hasOwnProperty('_exclude_from_summary') ? node._exclude_from_summary : undefined;
        const summaryBreakStyle = node.hasOwnProperty('_summary_break_style') ? node._summary_break_style : undefined;

        const bodyDoms =
            [
                $_$('ul', {
                    class: 'nav nav-tabs',
                    name: 'subobject-tabheaders',
                    id: fieldID + '_tabs'
                }),

                $_$('div', {
                    class: 'tab-content col-md-12',
                    name: 'subobject-tabcontent'
                }, [DomMaker.genTabPane(fieldID + '_template', sandwich(), {
                    'excludeFromSummary': true
                })])
            ];

        const panelHeadingFunc = (headingDoms) => {
            headingDoms.push(
                $_$('div', {
                    style: 'float: right;'
                }, [
                    $_$('button', {
                        type: 'button',
                        class: 'btn btn-default btn-md cenarius-del-tab-btn',
                        name: 'del_tab_btn'
                    }, [$_$('span', {
                        class: 'glyphicon glyphicon-remove'
                    })]),

                    $_$('button', {
                        type: 'button',
                        class: 'btn btn-default btn-md cenarius-new-tab-btn',
                        name: 'new_tab_btn'
                    }, [$_$('span', {
                        class: 'glyphicon glyphicon-plus'
                    })])
                ])
            );

            return DomMaker.genPanelHeading(headingDoms, 'overflow: hidden');
        };

        let sogProps = {
            name: 'cenarius-subobject-group'
        };
        if (isSet(excludeFromSummary))
            sogProps.excludeFromSummary = excludeFromSummary;
        if (isSet(summaryBreakStyle))
            sogProps.summaryBreakStyle = summaryBreakStyle;

        node._fieldID = fieldID;
        node._sql_signal = 'subobject';

        let headingDoms = [name];
        if (node.hasOwnProperty('_help_text'))
            headingDoms.push($_$('div', {
                class: 'alert alert-info',
                style: ''
            }, [node._help_text]))

        return DomMaker.genPanel(headingDoms, bodyDoms,
            nCols, sogProps, {
                class: extraHtmlClass
            }, panelHeadingFunc);
    };

    genEnum(nodeParent, node, key, name, sandwich) {
        console.log('genEnum()');

        let formGenSelf = this;

        const isMultiChoice = node.hasOwnProperty('_enum_multi');

        let enumData = [];
        let simpleEnum = true;

        if (isMultiChoice) {
            enumData = node._enum_multi;
            simpleEnum = false;
        } else {
            enumData = node._enum;
            _.each(enumData, (item) => {
                simpleEnum &= typeof item !== 'object';
                if (!simpleEnum)
                    console.log('enum is complex because of: ' + typeof item);
            });
        }

        // Html class
        const extraHtmlClass = node.hasOwnProperty('_html_class') ?
            node._html_class : '';
        const nCols = node.hasOwnProperty('_cols') ? node._cols :
            this.currentDefaultNCols !== '' ? this.currentDefaultNCols :
            simpleEnum ? config.nCols.enum :
            config.nCols.complexEnum;
        const excludeFromSummary = node.hasOwnProperty('_exclude_from_summary') ? node._exclude_from_summary : undefined;
        const summaryBreakStyle = node.hasOwnProperty('_summary_break_style') ? node._summary_break_style : undefined;
        const titleInSummary = node.hasOwnProperty('_title_in_summary') ? node._title_in_summary : undefined;

        const fieldID = this.getNextID(key);
        const forceCheckbox = node.hasOwnProperty('_force_checkbox') && node._force_checkbox;
        const needCheckbox = this.forceCheckbox !== 'none' || forceCheckbox;
        const checkboxID = fieldID + '_ckbx';

        // Default value
        const defaultValue = node.hasOwnProperty('_default_value') ? node._default_value : 0;

        let enumDoms = [];
        if (simpleEnum) {
            let selectOptions = [];
            if (needCheckbox)
                selectOptions.push($_$('option', {}, [config.defaultEnumOptionText]));

            _.each(enumData, (item) => {
                selectOptions.push($_$('option', {}, [item]));
            })

            const selectDom = $_$('select', {
                class: 'selectpicker form-control',
                id: fieldID,
                name: fieldID,
                'data-live-search': true,
                defaultValue: defaultValue
            }, selectOptions);

            // The value of "true" is required - "undefined" only works sometimes
            $($(selectDom).children()[defaultValue]).attr('selected', true);

            const inputName = name + config.autoLabelColon + config.autoLabelSpace;
            const inputDoms =
                [$_$('span', {
                        class: 'input-group-addon cenarius-input-tag'
                    }, [$_$('b', {}, [inputName])]),
                    selectDom
                ];

            let seProps = {
                name: 'cenarius-input-group',
                class: 'col-md-' + nCols + ' ' + extraHtmlClass
            };
            if (isSet(excludeFromSummary))
                seProps.excludeFromSummary = excludeFromSummary;
            if (isSet(summaryBreakStyle))
                seProps.summaryBreakStyle = summaryBreakStyle;
            if (isSet(titleInSummary))
                seProps.titleInSummary = titleInSummary;

            enumDoms = $_$('div', seProps, [$_$('div', {
                    class: 'input-group'
                }, needCheckbox ?
                DomMaker.genCheckboxWrapper(checkboxID, this.forceCheckbox, inputDoms) : inputDoms)]);
        } else {
            const choiceTypeIcon =
                $_$('span', {
                    class: 'pull-right glyphicon glyphicon-tag' + (isMultiChoice ? 's' : ''),
                    name: 'choice-type-icon'
                });

            let ceProps = {
                name: isMultiChoice ? 'cenarius-multi-choice-group' : 'cenarius-single-choice-group'
            };
            if (isSet(excludeFromSummary))
                ceProps.excludeFromSummary = excludeFromSummary;
            if (isSet(summaryBreakStyle))
                ceProps.summaryBreakStyle = summaryBreakStyle;
            if (isSet(titleInSummary))
                ceProps.titleInSummary = titleInSummary;


            this.setForceCheckbox(isMultiChoice);
            enumDoms = DomMaker.genPanel([name, choiceTypeIcon],
                sandwich(),
                nCols, ceProps, {
                    class: extraHtmlClass
                }
            );
            this.unsetForceCheckbox();
        }

        node._fieldID = fieldID;
        node._sql_signal = SQLTypeTable.string;

        return enumDoms;
    };

    genLeaf(nodeParent, node, type, key, name) {
        console.log('genLeaf()');

        const htmlInputType = HtmlInputTypeTable[type];
        const isTextArea = type === 'big_string';
        const inputTag = isTextArea ? 'textarea' : 'input';

        const numStep = type === 'integer' ? 1 :
            (node.hasOwnProperty('_number_step') ?
                node._number_step : config.defaultNumberStep);
        const numMin = node.hasOwnProperty('_min') ? node._min : '';
        const numMax = node.hasOwnProperty('_max') ? node._max : '';

        let maxStringLength = isInt(node._max_string_length) ?
            node._max_string_length : config.maxLength[type];

        // Default value
        let defaultValue = '';
        if (node.hasOwnProperty('_default_value')) {
            defaultValue = node._default_value;
        } else {
            if (htmlInputType === 'number') {
                defaultValue = '0';
            } else if (htmlInputType === 'date') {
                defaultValue = (new Date()).toISOString().slice(0, 10);
            }
        }

        const textAlignment = isTextArea ? '' : 'text-align: right; ';
        const textAreaRows = isTextArea ?
            (node.hasOwnProperty('_textarea_rows') ? node._textarea_rows : '5') : '';

        const fieldStyle = textAlignment;
        const fieldID = this.getNextID(key);
        const fieldName = name + config.autoLabelColon + config.autoLabelSpace;
        const forceCheckbox = node.hasOwnProperty('_force_checkbox') && node._force_checkbox;
        const needCheckbox = this.forceCheckbox !== 'none' || forceCheckbox;
        let endingSpan = node.hasOwnProperty('_ending') ?
            $_$('span', {
                class: 'input-group-addon cenarius-input-tag'
            }, [node._ending]) : undefined;
        const checkboxID = fieldID + '_ckbx';

        if (!isSet(endingSpan) && type === 'big_string') {
            endingSpan = $_$('span', {
                class: 'input-group-addon cenarius-input-tag',
                name: 'textarea-counter'
            }, [defaultValue.length + '<br>------<br>' + maxStringLength]);
        }

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
                            let ckbxProps = {
                                type: 'checkbox',
                                id: fieldID,
                                name: fieldID,
                                class: this.forceCheckbox === 'single' ? 'single-choice-checkbox' : '',
                                autocomplete: 'off',
                            }

                            if (defaultValue === true) ckbxProps.checked = true;
                            const ckbxInputDom = $_$('input', ckbxProps);
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
                            let regularInputProps = {
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
                            $(regularInputDom).change(function() {
                                node._value = $(this).val()
                            })
                            let regularFieldDoms =
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
                                return DomMaker.genCheckboxWrapper(fieldID + '_ckbx', this.forceCheckbox, regularFieldDoms);
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

        const nCols = node.hasOwnProperty('_cols') ? node._cols :
            this.currentDefaultNCols !== '' ? this.currentDefaultNCols :
            config.nCols.input;
        const extraHtmlClass = node.hasOwnProperty('_html_class') ?
            node._html_class : '';
        const excludeFromSummary = node.hasOwnProperty('_exclude_from_summary') ? node._exclude_from_summary : undefined;
        const summaryBreakStyle = node.hasOwnProperty('_summary_break_style') ? node._summary_break_style : undefined;
        const titleInSummary = node.hasOwnProperty('_title_in_summary') ? node._title_in_summary : undefined;

        let igProps = {
            name: 'cenarius-input-group',
            class: 'col-md-' + nCols + ' ' + extraHtmlClass
        };
        if (isSet(excludeFromSummary))
            igProps.excludeFromSummary = true;
        if (isSet(summaryBreakStyle))
            igProps.summaryBreakStyle = summaryBreakStyle;
        if (isSet(titleInSummary))
            igProps.titleInSummary = titleInSummary;

        const inputGroupDom =
            $_$('div', igProps, [
                $_$('div', {
                        class: 'input-group',
                        style: 'width: 100% !important'
                    },
                    inputDoms)
            ]);

        // Forced checkbox fields are just multi-choice or complex selections
        if (this.forceCheckbox === 'none') {
            node._fieldID = fieldID;
            node._sql_signal = SQLTypeTable[type];
        }

        return inputGroupDom;
    };

    genSpace(node) {
        const nCols = node.hasOwnProperty('_cols') ? node._cols :
            this.currentDefaultNCols !== '' ? this.currentDefaultNCols :
            config.nCols.input;
        const extraHtmlClass = node.hasOwnProperty('_html_class') ?
            node._html_class : '';

        return $_$('div', {
            class: 'col-md-offset-' + nCols + ' ' + extraHtmlClass,
            style: 'height: 46px !important',
            excludeFromSummary: true
        });
    }

    visitFormaNode(node, key) {
        let formGenSelf = this;
        let next = node[key];

        // Extract flags
        let name;
        if (next.hasOwnProperty('_title')) name = next._title;
        else if (typeof next === 'string') name = next;
        else name = getNameFromKey(key);

        const hasProps = next.hasOwnProperty('_properties');
        const children = hasProps ? next._properties :
            next.hasOwnProperty('_enum') ? next._enum :
            next.hasOwnProperty('_enum_multi') ? next._enum_multi : {};

        const type = (next.hasOwnProperty('_type') ? next._type :
            (next.hasOwnProperty('_enum') || next.hasOwnProperty('_enum_multi') ? 'enum' :
                (hasProps && config.inferObjectFromProps ? 'object' :
                    formGenSelf.currentDefaultType)));
        if (typeof next === 'string') {
            next = {
                _title: next
            }
            node[key] = next;
        }
        next._type = type;

        // console.log('key: ' + key + ', name: ' + name + ', content: ' + next + ', type: ' + type);

        const defaultType = next.hasOwnProperty('_default_type') ? next._default_type :
            (type === 'enum' ? 'boolean' : 'string');

        const defaultNCols = next.hasOwnProperty('_default_cols') ? next._default_cols : '';

        function sandwich() {
            return _.map(Object.keys(children),
                (nextKey) => {
                    formGenSelf.setDefaultType(defaultType);
                    formGenSelf.setDefaultNCols(defaultNCols);

                    const resDom = formGenSelf.visitFormaNode(children, nextKey);

                    formGenSelf.resetDefaultType();
                    formGenSelf.resetDefaultNCols();

                    return resDom;
                }
            );
        };

        switch (type) {
            case 'object':
                return formGenSelf.genObj(next, key, name, sandwich);
            case 'subobject':
                return formGenSelf.genSubobj(next, key, name, sandwich);
            case 'enum':
                return formGenSelf.genEnum(node, next, key, name, sandwich);
            case 'space':
                return formGenSelf.genSpace(next);
            default:
                return formGenSelf.genLeaf(node, next, type, key, name);
        }
    }
};

class DomMaker {
    static genCheckboxWrapper(checkboxID, checkboxType, fieldDoms) {
        const doms =
            [
                $_$('input', {
                    type: 'checkbox',
                    id: checkboxID,
                    name: checkboxID,
                    class: checkboxType === 'single' ? 'single-choice-checkbox' : '',
                    autocomplete: 'off'
                }),
                $_$('label', {
                    for: checkboxID,
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
        return doms;
    };

    static genContent(headingText, formaDoms) {
        const html =
            $_$('div', {
                class: 'container',
                name: 'cenarius-content'
            }, [$_$('div', {
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
        return html;
    };

    static genCtrlPanel() {
        const html =
            $_$('div', {
                class: 'container',
                name: 'cenarius-ctrl-panel',
                style: 'padding: 0'
            }, [
                $_$('button', {
                    type: 'button',
                    class: 'btn btn-danger btn-lg',
                    name: 'reset_btn'
                }, [
                    $_$('span', {
                        class: 'glyphicon glyphicon-trash'
                    }), [' Reset Fields']
                ]),
                $_$('button', {
                    type: 'button',
                    class: 'btn btn-success btn-lg',
                    name: 'summarize_btn',
                    'data-toggle': 'modal',
                    'data-target': '#summary_modal'
                }, [
                    $_$('span', {
                        class: 'glyphicon glyphicon-book'
                    }), [' Summarize']
                ]),
                $_$('button', {
                    type: 'button',
                    class: 'btn btn-primary btn-lg',
                    name: 'sql_btn',
                    'data-toggle': 'modal',
                    'data-target': '#sql_modal'
                }, [
                    $_$('span', {
                        class: 'glyphicon glyphicon-cloud-upload'
                    }), [' Get SQL']
                ])
            ]);

        return html;
    };

    static genSummaryModal() {
        const html =
            $_$('div', {
                class: 'modal fade',
                id: 'summary_modal',
                role: 'dialog',
                tabindex: -1
            }, [$_$('div', {
                class: 'modal-dialog modal-lg'
            }, [$_$('div', {
                class: 'modal-content'
            }, [$_$('div', {
                    class: 'modal-header'
                }, [$_$('button', {
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
                }, [$_$('p', {}, ['//Summary Placeholder//'])]),
                $_$('div', {
                    class: 'modal-footer'
                }, [$_$('button', {
                        type: 'button',
                        class: 'btn btn-default',
                        'data-dismiss': 'modal',
                        style: 'float: left'
                    }, ['Close']),
                    $_$('button', {
                        type: 'button',
                        class: 'btn btn-success',
                        id: 'copy_summary_btn',
                        'data-dismiss': 'modal'
                    }, ['Copy']),
                    $_$('button', {
                        type: 'button',
                        class: 'btn btn-primary',
                        id: 'submit_btn',
                        'data-dismiss': 'modal'
                    }, ['Submit'])
                ])
            ])])]);
        return html;
    };

    static genSQLModal() {
        const html =
            $_$('div', {
                class: 'modal fade',
                id: 'sql_modal',
                role: 'dialog',
                tabindex: -1
            }, [$_$('div', {
                class: 'modal-dialog modal-lg'
            }, [$_$('div', {
                class: 'modal-content'
            }, [$_$('div', {
                    class: 'modal-header'
                }, [$_$('button', {
                        type: 'button',
                        class: 'close',
                        'data-dismiss': 'modal'
                    }, ['&times;']),
                    $_$('h4', {
                        class: 'modal-title'
                    }, ['SQL Schema']),
                    $_$('button', {
                        type: 'button',
                        class: 'btn btn-success',
                        id: 'copy_sql_btn',
                        'data-dismiss': 'modal',
                        style: 'float:right'
                    }, ['Copy'])
                ]),
                $_$('div', {
                    class: 'modal-body'
                }, [$_$('p', {}, ['//SQL Placeholder//'])]),
                $_$('div', {
                    class: 'modal-footer'
                }, [$_$('button', {
                    type: 'button',
                    class: 'btn btn-default',
                    'data-dismiss': 'modal'
                }, ['Close'])])
            ])])]);
        return html;
    };

    static genTabRef(hrefLink, tabTitle, liAttr = {}, titleAttr = {}) {
        const tabRefDom =
            $_$('li', mergeStrProps({
                class: 'cenarius-tab-ref'
            }, liAttr), [
                $_$('a', mergeStrProps({
                    'data-toggle': 'tab',
                    href: '#' + hrefLink
                }, titleAttr), [
                    $_$('b', {}, [tabTitle])
                ])
            ]);
        return tabRefDom;
    };

    static genTabPane(id, contentDoms, attr = {}) {
        const tabPaneDom =
            $_$('div', mergeStrProps({
                id: id,
                class: 'tab-pane'
            }, attr), contentDoms);
        return tabPaneDom;
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

    static genPanel(headingDoms,
        bodyDoms,
        nCols = 12,
        wrapperProps = {},
        panelProps = {},
        headingFunc = this.genPanelHeading,
        bodyFunc = this.genPanelBody) {
        return $_$('div', mergeStrProps({
            class: 'col-md-' + nCols
        }, wrapperProps), [$_$('div', mergeStrProps({
            class: 'panel panel-default clearfix ',
        }, panelProps), [headingFunc(headingDoms),
            bodyFunc(bodyDoms)
        ])]);
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
        const skip = $dom.attr('excludeFromSummary');

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

    static gen(cenariusForm) {
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
            name: tableName + '_id',
            sqlType: 'integer',
            notNull: true,
            autoIncrement: true,
            primaryKey: true
        };
    }

    constructor(tableName) {
        this.mainTableName = tableName;
        this.tables = [{
            tableName: tableName,
            fields: [SQLSchemaGenerator.genIDColumn(tableName)]
        }];
    }

    visitFormaNode(node, key, dest) {
        let sqlGenSelf = this;
        const next = node[key];
        const type = next._type;
        const parentTableName = dest.tableName;

        if (next.hasOwnProperty('_sql_signal')) {
            if (next._sql_signal === 'subobject') {
                const soTableName = parentTableName +
                    '.' + next._fieldID.replace(/_subobject_f[0-9]*$/, '');
                const soTable = {
                    tableName: soTableName,
                    fields: [
                        SQLSchemaGenerator.genIDColumn(soTableName), {
                            name: parentTableName + '_ref',
                            sqlType: 'integer',
                            notNull: true,
                            foreignRef: parentTableName
                        }
                    ]
                }
                this.tables.push(soTable);
                dest = this.tables.last();
            } else {
                dest.fields.push({
                    name: next._fieldID,
                    sqlType: next._sql_signal,
                    value: next._value
                });
            }
        }

        switch (type) {
            case 'object':
            case 'subobject':
                {
                    _.each(Object.keys(next._properties), function(childKey) {
                        sqlGenSelf.visitFormaNode(next._properties, childKey, dest);
                    })
                    break;
                }
            default:
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
                            bracket(fd.foreignRef + '_id') + ')') : '')
                return fdStr;
            }, ', \n') +
            '\n);';

        return str;
    }

    static gen(forma, tableName) {
        let sqlGen = new SQLSchemaGenerator(tableName);

        _.each(Object.keys(forma), function(key) {
            sqlGen.visitFormaNode(forma, key, sqlGen.tables[0]);
        })

        return JSON.stringify(sqlGen.tables, null ,2);
        // return mapJoin(sqlGen.tables, (td) => {
        //     return SQLSchemaGenerator.stringify(td);
        // }, '\n');
    }
}

function main(global, $) {
    $.fn.cenarius = function(headingText, options) {
        myForma = options.forma;
        let myFG = new FormGenerator();

        const formaDoms =
            _.map(Object.keys(myForma),
                function(key) {
                    return myFG.visitFormaNode(myForma, key);
                }
            );

        const contentDoms = DomMaker.genContent(headingText, formaDoms);

        const ctrlDoms = DomMaker.genCtrlPanel();

        const summaryModalDoms = DomMaker.genSummaryModal();

        const sqlModalDoms = DomMaker.genSQLModal();

        const finalDom =
            $_$('div', {
                id: 'bootstrap-overrides'
            }, [contentDoms, ctrlDoms, summaryModalDoms, sqlModalDoms]);

        this.replaceWith(finalDom);
    }

    $.fn.sortByDepth = function() {
        return $(this).sort(function(a, b) {
            return $(b).parents().length - $(a).parents().length;
        });
    };
};


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

function resetAllFields() {
    $('input').each(function() {
        let $this = $(this);

        if ($this.prop('type') === 'checkbox') {
            setCheckbox($this, false);
        } else {
            const defaultValue = $this.prop('defaultValue');
            $this.prop('value', defaultValue);
        }
    })

    $('textarea').each(function() {
        let $this = $(this);
        $this.prop('value', $this.prop('defaultValue'));
    })

    $('select').val(config.defaultEnumOptionText).change();

    $('ul[name=subobject-tabheaders]').each(function() {
        while ($(this).children().length > 0)
            delSubobjectInstance(this);

        spawnMinimumSubobjectInstances(this);
    })
}

function inputToggleCheckbox(input) {
    let $input = $(input);
    let ckbx = $($input.parent().parent().siblings('input[type=checkbox]'));

    if ($input.is('input')) {
        setCheckbox(ckbx, $input.val().length > 0);
    } else if ($input.is('select')) {
        setCheckbox(ckbx, $input.val() !== config.defaultEnumOptionText);
    }
}

function setCheckbox(ckbx, val) {
    const $ckbx = $(ckbx);
    const checked = $ckbx.prop('checked');
    if ((val && !checked) || (checked && !val))
        $ckbx.trigger('click');
}

function singleChoiceToggle(ckbx) {
    let $ckbx = $(ckbx);
    if ($ckbx.prop('checked')) {
        $ckbx.parent().parent().siblings().each(function() {
            $(this).find('input[type=checkbox]').each(function() {
                if ($(this).prop('checked'))
                    $(this).trigger('click');
            });
        });
    }
}

function addSubobjectInstance(tabHeaders) {
    let $tabHeaders = $(tabHeaders);
    const tabID = $tabHeaders.prop('id');
    const templateID = tabID.replace('_tabs', '_template');
    let $tabContent = ($tabHeaders.siblings('div[name=subobject-tabcontent]'));
    const template = $tabContent.children('#' + templateID);

    // Clone template
    let clone = template.clone();
    let cloneIndex = 0;
    template.parent().children().each(function() {
        let idStr = $(this).prop('id');

        // Remove everything before template token
        const idStrTmplIdx = idStr.lastIndexOf('_template_');
        if (idStrTmplIdx > 0)
            idStr = idStr.substring(idStrTmplIdx + '_template_'.length);

        // Remove everything after the stat of the instance token
        const idStrInstIdx = idStr.indexOf('_instance-');
        if (idStrInstIdx > 0)
            idStr = idStr.substring(0, idStrInstIdx);

        const id = parseInt(idStr, 10);
        if (!isNaN(id))
            cloneIndex = id > cloneIndex ? id : cloneIndex;
    });
    cloneIndex += 1;

    // Fix cloned element IDs
    const cloneID = tabID.replace('_tabs', '_template_' + cloneIndex);

    function fixCloneField(
        node,
        fieldName,
        valGenFunc = (node, oldVal, toAppend) => {
            return oldVal + toAppend;
        }) {
        const fieldVal = node.attr(fieldName);
        if (typeof fieldVal !== 'undefined' && fieldVal !== false) {
            const fieldVal = node.prop(fieldName);
            if (isSet(fieldVal)) {
                // console.log('Fix ' + fieldName + '}' + fieldVal + 'n-> ' + valGenFunc(node, fieldVal, '::instance-'' + cloneIndex));
                node.prop(fieldName, valGenFunc(node, fieldVal, '_instance-' + cloneIndex));
            }
        }
    }

    descendAll(clone, function(node) {
        fixCloneField(node, 'id');
        fixCloneField(node, 'name');
        fixCloneField(node, 'for');
        fixCloneField(node, 'href');
    });

    // Remove excludeFromSummary attr (template is never included in summary)
    $(clone).removeAttr('excludeFromSummary');

    let cloneSONewBtns = $(clone).find('button[name^=new_tab_btn]');
    cloneSONewBtns.unbind('click');
    cloneSONewBtns.click(newTabBtnClicked);

    let cloneSODelBtns = $(clone).find('button[name^=del_tab_btn]');
    cloneSODelBtns.unbind('click');
    cloneSODelBtns.click(delTabBtnClicked);

    clone.prop('id', cloneID);
    $tabContent.append(clone);

    // De-select the rest
    $tabHeaders.children().removeClass('active in');
    $tabContent.children().removeClass('active in');

    $tabHeaders.append(DomMaker.genTabRef(cloneID, '#' + cloneIndex, {
        class: 'active'
    }));
    $('#' + cloneID).addClass('active in');
}

function delSubobjectInstance(tabHeaders) {
    let $tabHeaders = $(tabHeaders);
    let $tabContent = $($tabHeaders.siblings('div[name=subobject-tabcontent]'));
    const lastActiveLi = $tabHeaders.children('li.active');
    const lastActiveTabcontent = $tabContent.children('div.active');
    const lastActiveIndex = lastActiveLi.index();

    lastActiveLi.remove();
    lastActiveTabcontent.remove();

    // Set new active tab
    const newActiveIndex = lastActiveIndex >= $tabHeaders.children().length ?
        (lastActiveIndex - 1) : lastActiveIndex;
    $tabHeaders.children().eq(newActiveIndex).addClass('active in');
    $tabContent.children().eq(newActiveIndex + 1).addClass('active in');
}

function spawnMinimumSubobjectInstances(tabHeaders, tabContent = $(tabHeaders).siblings('div.tab-content')) {
    while (tabContent.children().length - 1 < config.minSubobjectInstance) {
        addSubobjectInstance(tabHeaders);
    }
}

function delTabBtnClicked() {
    if (confirm('Confirm delete?')) {
        let tabHeaders = $(this).parent().parent().siblings('.panel-body').children('ul[name=subobject-tabheaders]');
        delSubobjectInstance(tabHeaders);
        spawnMinimumSubobjectInstances(tabHeaders);
    }
}

function newTabBtnClicked() {
    addSubobjectInstance($(this).parent().parent().siblings('.panel-body').children('ul[name=subobject-tabheaders]'));
}


function mapJoin(obj, func, sep = '') {
    return _.map(obj, func).join(sep);
}

//Returns true if it is a DOM node
function isNode(o) {
    return (
        typeof Node === "object" ? o instanceof Node :
        o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName === "string"
    );
}

//Returns true if it is a DOM element    
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
    const res = mapJoin(str.replaceAll('_', ' ').match(/\w+/g), (w) => {
        return w.charAt(0).toUpperCase() + w.substring(1);
    }, '');
    return res;
}

String.prototype.replaceAll = function(search, replacement) {
    return this.replace(new RegExp(search, 'g'), replacement);
};

Array.prototype.last = function() {
    return this[this.length - 1];
};

function descendAll(node, func) {
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

$(() => { /* DOM ready */
    $('button[name^=del_tab_btn]').click(delTabBtnClicked);

    $('button[name^=new_tab_btn]').click(newTabBtnClicked);

    // Spawn one instance of each suboject using their template
    $('ul[name=subobject-tabheaders]').sortByDepth().each(function(index) {
        spawnMinimumSubobjectInstances($(this));
    });

    // Fix button stuck in focus when alert shows up
    $('.btn').click(function(event) {
        $(this).blur();
    });

    $('button[name=reset_btn]').click(function() {
        if (confirm('Are you sure you want to reset (clear) all fields?')) {
            resetAllFields();
        }
    });

    $('button[name=summarize_btn]').click(function() {
        let $summary = $('#summary_modal .modal-dialog .modal-content .modal-body');
        const summaryHtml = SummaryGenerator.gen($(this).parent().siblings('div[name=cenarius-content]').children('form[name=cenarius-form]'));
        $summary.html(summaryHtml);
    });

    $('button[name=sql_btn]').click(function(e) {
        let $sql = $('#sql_modal .modal-dialog .modal-content .modal-body');
        const tableName = prompt('New table name: ', 'new_test_table');
        if (tableName !== null && tableName.length > 0) {
            $sql.html($_$('pre', {}, [SQLSchemaGenerator.gen(myForma, tableName)]));
        } else {
            e.stopPropagation();
        }
    });

    $('#submit_btn').click(function() {
        const formData = $('form[name=cenarius-form]').serializeArray();
        const str = JSON.stringify(formData);
        alert(str);
    });

    $('#copy_summary_btn').click(function(e) {
        e.stopPropagation();
        const res = copyToClipboard($(this).parent().siblings('.modal-body')
            .children('p')[0]);
        if (res)
            showSnackbar('Copied to clipboard.');
        else
            showSnackbar('Browser does not support copy function.');
    });

    $('#copy_sql_btn').click(function(e) {
        e.stopPropagation();
        const res = copyToClipboard($(this).parent().siblings('.modal-body').children('pre')[0]);
        if (res)
            showSnackbar('Copied to clipboard.');
        else
            showSnackbar('Browser does not support copy function.');
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

    $('.form-control').keyup(function() {
        inputToggleCheckbox(this);
    });

    $('.form-control').change(function() {
        inputToggleCheckbox(this);
    });

    // Set initial state for checkboxes
    $('.form-control').trigger('change');

    $('input[type=checkbox].single-choice-checkbox').change(function() {
        singleChoiceToggle(this);
    });
});