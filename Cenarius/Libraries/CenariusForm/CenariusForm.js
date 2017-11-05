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

        const helpAlert = node.hasOwnProperty('_help_text') ?
            $_$('div', {
                    class: 'alert alert-info'
                },
                node._help_text
            ) : '';


        const genTabs = (bodyStr) => {
            // Generate sandwich content and separate them
            const bodyDom = $.parseHTML(bodyStr);
            let pages = [];
            $(bodyDom).children().each(function() {
                const $this = $(this);
                pages.push({
                    name: $this.children('div.panel-heading').html(),
                    content: $($this.children('div.panel-body')).html(),
                    attr: {
                        class: pages.length == 0 ? 'active' : ''
                    }
                });
            });
            console.log('oii');
            console.log(pages);
            const tabHeaderStr = mapJoin(pages, (page) => {
                return Htmler.genTabRef(identifierize(page.name) + '_groupingtab', page.name, page.attr);
            });

            const tabContentStr = mapJoin(pages, (page) => {
                return Htmler.genTabPane(identifierize(page.name) + '_groupingtab', page.content, page.attr);
            })

            const tabsHtml =
                $_$('div', {
                        name: 'cenarius-either-group'
                    },
                    $_$('ul', {
                            class: 'nav nav-tabs nav-justified',
                            id: fieldID + '_tabs',
                            name: 'cenarius-either-group-tabheaders'
                        },
                        tabHeaderStr
                    ) +
                    $_$('div', {
                            class: 'tab-content col-md-12',
                            name: 'cenarius-either-group-tabcontent'
                        },
                        tabContentStr
                    )
                );

            return tabsHtml;
        }

        const html = needTabs ? genTabs(sandwich()) : sandwich();
        let ogProps = {
            name: 'cenarius-object-group'
        };
        if (isSet(excludeFromSummary))
            ogProps.excludeFromSummary = excludeFromSummary;
        if (isSet(summaryBreakStyle))
            ogProps.summaryBreakStyle = summaryBreakStyle;

        return Htmler.genPanel(name + helpAlert, html,
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

        const panelBody =
            $_$('ul', {
                class: 'nav nav-tabs',
                name: 'subobject-tabheaders',
                id: fieldID + '_tabs'
            }) +
            $_$('div', {
                    class: 'tab-content col-md-12',
                    name: 'subobject-tabcontent'
                },
                Htmler.genTabPane(fieldID + '_template', sandwich(), {
                    'excludeFromSummary': true
                })
            );

        const panelHeadingFunc = (heading) => {
            const subobjectHeading =
                heading +
                $_$('div', {
                        style: 'float: right;'
                    },
                    $_$('button', {
                            type: 'button',
                            class: 'btn btn-default btn-md cenarius-del-tab-btn',
                            name: 'del_tab_btn'
                        },
                        $_$('span', {
                            class: 'glyphicon glyphicon-remove'
                        })
                    ) +
                    $_$('button', {
                            type: 'button',
                            class: 'btn btn-default btn-md cenarius-new-tab-btn',
                            name: 'new_tab_btn'
                        },
                        $_$('span', {
                            class: 'glyphicon glyphicon-plus'
                        })
                    )
                );

            return Htmler.genPanelHeading(subobjectHeading, 'overflow: hidden');
        };

        const helpAlert = node.hasOwnProperty('_help_text') ?
            $_$('div', {
                    class: 'alert alert-info',
                    style: ''
                },
                node._help_text
            ) : '';

        let sogProps = {
            name: 'cenarius-subobject-group'
        };
        if (isSet(excludeFromSummary))
            sogProps.excludeFromSummary = excludeFromSummary;
        if (isSet(summaryBreakStyle))
            sogProps.summaryBreakStyle = summaryBreakStyle;

        node._fieldID = fieldID;
        node._sql_type = 'subobject';

        return Htmler.genPanel(name + helpAlert,
            panelBody,
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

        let html = '';
        if (simpleEnum) {
            const selectDom =
                $.parseHTML($_$('select', {
                        class: 'selectpicker form-control',
                        id: fieldID,
                        name: fieldID,
                        'data-live-search': true
                    },
                    (needCheckbox ? $_$('option', {
                        defaultOption: undefined
                    }, config.defaultEnumOptionText) : '') +
                    mapJoin(enumData, (item) => {
                        return $_$('option', {}, item);
                    })
                ))[0];

            // The value of "true" is required - "undefined" only works sometimes
            $($(selectDom).children()[defaultValue]).attr('selected', true);
            const selectHtml = selectDom.outerHTML;

            const enumHtml =
                $_$('span', {
                        class: 'input-group-addon cenarius-input-tag'
                    },
                    $_$('b', {}, name + config.autoLabelColon + config.autoLabelSpace)
                ) +
                selectHtml;

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

            html =
                $_$('div', seProps, $_$('div', {
                    class: 'input-group'
                }, needCheckbox ? Htmler.genCheckboxWrapper(checkboxID, this.forceCheckbox, enumHtml) : enumHtml));
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
            html =
                Htmler.genPanel(name + choiceTypeIcon,
                    sandwich(),
                    nCols, ceProps, {
                        class: extraHtmlClass
                    }
                );
            this.unsetForceCheckbox();
        }

        node._fieldID = fieldID;
        node._sql_type = 'string';

        return html;
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
            }, node._ending) : '';
        const checkboxID = fieldID + '_ckbx';

        if (endingSpan.length === 0 && type === 'big_string') {
            endingSpan = $_$('span', {
                class: 'input-group-addon cenarius-input-tag',
                name: 'textarea-counter'
            }, defaultValue.length + '<br>------<br>' + maxStringLength);
        }

        // Generate the field html which might include an input addon and an ending
        const inputHtml =
            (() => {
                switch (htmlInputType) {
                    case 'label':
                        {
                            const html =
                                $_$('div', {
                                        class: 'alert alert-success',
                                        style: 'text-align: center'
                                    },
                                    fieldName
                                );
                            return html;
                        }
                    case 'checkbox':
                        {
                            const html =
                                $_$('input', (() => {
                                        let ckbxProps = {
                                            type: 'checkbox',
                                            id: fieldID,
                                            name: fieldID,
                                            class: this.forceCheckbox === 'single' ? 'single-choice-checkbox' : '',
                                            autocomplete: 'off',
                                        }

                                        defaultValue === true ? (ckbxProps.checked = true) : nullStm();
                                        return ckbxProps;
                                    })(),
                                    $_$('label', {
                                            for: fieldID,
                                            class: 'btn btn-default cenarius-ckbx-btn checkbox-displayer'
                                        },
                                        $_$('span', {
                                            class: 'glyphicon glyphicon-ok cenarius-chbkx-icon'
                                        }) +
                                        $_$('span', {}, _space)
                                    ) +
                                    $_$('label', {
                                        for: fieldID,
                                        class: 'btn btn-default cenarius-ckbx-lbl'
                                    }, name)
                                );

                            return html;
                        }
                    case 'text':
                    case 'number':
                    case 'date':
                        {
                            const fieldHtml =
                                $_$('span', {
                                        class: 'input-group-addon cenarius-input-tag'
                                    },
                                    $_$('b', {}, fieldName)) +
                                $_$(inputTag, (() => {
                                    let inputProps = {
                                        class: 'form-control',
                                        style: fieldStyle,
                                        id: fieldID,
                                        name: fieldID,
                                        type: htmlInputType,
                                        step: numStep,
                                        defaultValue: defaultValue,
                                        value: defaultValue
                                    };
                                    numMin.length > 0 ? (inputProps.min = numMin) : nullStm();
                                    numMax.length > 0 ? (inputProps.max = numMax) : nullStm();
                                    defaultValue.length > 0 ? (inputProps.value = defaultValue) : nullStm();
                                    textAreaRows.length > 0 ? (inputProps.rows = textAreaRows) : nullStm();
                                    maxStringLength.length > 0 ? (inputProps.maxlength = maxStringLength) : nullStm();
                                    return inputProps;
                                })(), isTextArea ? defaultValue : '', isTextArea) +
                                endingSpan;

                            if (needCheckbox) {
                                // This should only happen in complex lists
                                return Htmler.genCheckboxWrapper(fieldID + '_ckbx', this.forceCheckbox, fieldHtml);
                            } else {
                                return fieldHtml;
                            }
                        }
                    default:
                        {
                            return $_$('p', {}, $_$('b', {}, '[CenariusFormError] Unknown field type: ' + type));
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

        const html =
            $_$('div', igProps,
                $_$('div', {
                    class: 'input-group',
                    style: 'width: 100% !important'
                }, inputHtml)
            );

        node._fieldID = fieldID;

        // Forced checkbox fields are just multi-choice or complex selections
        if (this.forceCheckbox === 'none') {
            node._sql_type = SQLTypeTable[type];
        }

        return html;
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
            return mapJoin(Object.keys(children),
                (nextKey) => {
                    formGenSelf.setDefaultType(defaultType);
                    formGenSelf.setDefaultNCols(defaultNCols);

                    const resHtml = formGenSelf.visitFormaNode(children, nextKey);

                    formGenSelf.resetDefaultType();
                    formGenSelf.resetDefaultNCols();

                    return resHtml;
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

class Htmler {
    static genCheckboxWrapper(checkboxID, checkboxType, fieldHtml) {
        const resHtml =
            $_$('input', {
                    type: 'checkbox',
                    id: checkboxID,
                    name: checkboxID,
                    class: this.forceCheckbox === 'single' ? 'single-choice-checkbox' : '',
                    autocomplete: 'off'
                },
                $_$('label', {
                        for: checkboxID,
                        class: 'btn btn-default cenarius-ckbx-btn checkbox-displayer'
                    },
                    $_$('span', {
                        class: 'glyphicon glyphicon-ok cenarius-chbkx-icon'
                    })
                ) +
                $_$('span', {
                        style: 'width:100%; display: table-cell',
                        class: 'cenarius-checkbox-wrapper'
                    },
                    $_$('span', {
                        style: 'width:100%; min-height: 34px; display: table'
                    }, fieldHtml)
                )
            );
        return resHtml;
    };

    static genContentHtml(headingText, formaHtml) {
        const html =
            $_$('div', {
                    class: 'container',
                    name: 'cenarius-content'
                },
                $_$('div', {
                        class: 'row',
                        name: 'cenarius-header',
                    },
                    $_$('h1', {}, headingText)
                ) +
                $_$('form', {
                        class: 'row',
                        name: 'cenarius-form',
                        action: '/Home/Test1',
                        method: 'post'
                    },
                    $_$('div', {
                        class: 'col-md-12',
                        style: 'padding-bottom: 10px'
                    }, formaHtml)
                )
            );
        return html;
    };

    static genCtrlPanel() {
        const html =
            $_$('div', {
                    class: 'container',
                    name: 'cenarius-ctrl-panel',
                    style: 'padding: 0'
                },
                $_$('button', {
                        type: 'button',
                        class: 'btn btn-danger btn-lg',
                        name: 'reset_btn'
                    },
                    $_$('span', {
                        class: 'glyphicon glyphicon-trash'
                    }) +
                    _space + _space + _space + 'Reset Fields'
                ) +
                $_$('button', {
                        type: 'button',
                        class: 'btn btn-success btn-lg',
                        name: 'summarize_btn',
                        'data-toggle': 'modal',
                        'data-target': '#summary_modal'
                    },
                    $_$('span', {
                        class: 'glyphicon glyphicon-book'
                    }) +
                    _space + _space + _space + 'Summarize'
                ) +
                $_$('button', {
                        type: 'button',
                        class: 'btn btn-primary btn-lg',
                        name: 'sql_btn',
                        'data-toggle': 'modal',
                        'data-target': '#sql_modal'
                    },
                    $_$('span', {
                        class: 'glyphicon glyphicon-cloud-upload'
                    }) +
                    _space + _space + _space + 'Get SQL'
                )
            );

        return html;
    };

    static genSummaryModalHtml() {
        const html =
            $_$('div', {
                    class: 'modal fade',
                    id: 'summary_modal',
                    role: 'dialog',
                    tabindex: -1
                },
                $_$('div', {
                        class: 'modal-dialog modal-lg'
                    },
                    $_$('div', {
                            class: 'modal-content'
                        },
                        $_$('div', {
                                class: 'modal-header'
                            },
                            $_$('button', {
                                    type: 'button',
                                    class: 'close',
                                    'data-dismiss': 'modal'
                                },
                                '&times;'
                            ) +
                            $_$('h4', {
                                    class: 'modal-title'
                                },
                                'Form Summary'
                            )
                        ) +
                        $_$('div', {
                                class: 'modal-body'
                            },
                            $_$('p', {},
                                '//Summary Placeholder//'
                            )
                        ) +
                        $_$('div', {
                                class: 'modal-footer'
                            },
                            $_$('button', {
                                    type: 'button',
                                    class: 'btn btn-default',
                                    'data-dismiss': 'modal',
                                    style: 'float: left'
                                },
                                'Close'
                            ) +
                            $_$('button', {
                                    type: 'button',
                                    class: 'btn btn-success',
                                    id: 'copy_summary_btn',
                                    'data-dismiss': 'modal'
                                },
                                'Copy'
                            ) +
                            $_$('button', {
                                    type: 'button',
                                    class: 'btn btn-primary',
                                    id: 'submit_btn',
                                    'data-dismiss': 'modal'
                                },
                                'Submit'
                            )
                        )
                    )
                )
            );
        return html;
    };

    static genSQLModalHtml() {
        const html =
            $_$('div', {
                    class: 'modal fade',
                    id: 'sql_modal',
                    role: 'dialog',
                    tabindex: -1
                },
                $_$('div', {
                        class: 'modal-dialog modal-lg'
                    },
                    $_$('div', {
                            class: 'modal-content'
                        },
                        $_$('div', {
                                class: 'modal-header'
                            },
                            $_$('button', {
                                    type: 'button',
                                    class: 'close',
                                    'data-dismiss': 'modal'
                                },
                                '&times;'
                            ) +
                            $_$('h4', {
                                    class: 'modal-title'
                                },
                                'SQL Schema'
                            ) +
                            $_$('button', {
                                    type: 'button',
                                    class: 'btn btn-success',
                                    id: 'copy_sql_btn',
                                    'data-dismiss': 'modal',
                                    style: 'float:right'
                                },
                                'Copy'
                            )
                        ) +
                        $_$('div', {
                                class: 'modal-body'
                            },
                            $_$('p', {},
                                '//SQL Placeholder//'
                            )
                        ) +
                        $_$('div', {
                                class: 'modal-footer'
                            },
                            $_$('button', {
                                    type: 'button',
                                    class: 'btn btn-default',
                                    'data-dismiss': 'modal'
                                },
                                'Close'
                            )
                        )
                    )
                )
            );
        return html;
    };

    static genTabRef(hrefLink, tabTitle, liAttr = {}, titleAttr = {}) {
        const html =
            $_$('li', mergeStrProps({
                    class: 'cenarius-tab-ref'
                }, liAttr),
                $_$('a', mergeStrProps({
                        'data-toggle': 'tab',
                        href: '#' + hrefLink
                    }, titleAttr),
                    $_$('b', {}, tabTitle)
                )
            );
        return html;
    };

    static genTabPane(id, content, attr = {}) {
        const html =
            $_$('div', mergeStrProps({
                    id: id,
                    class: 'tab-pane'
                }, attr),
                content
            );
        return html;
    }

    static genPanelHeading(content, styleStr = '') {
        return $_$('div', {
            class: 'panel-heading',
            style: styleStr
        }, content);
    };

    static genPanelBody(content, styleStr = '') {
        return $_$('div', {
            class: 'panel-body',
            style: styleStr
        }, content);
    };

    static genPanel(heading,
        body,
        nCols = 12,
        wrapperProps = {},
        panelProps = {},
        headingFunc = this.genPanelHeading,
        bodyFunc = this.genPanelBody) {
        return $_$('div', mergeStrProps({
                class: 'col-md-' + nCols
            }, wrapperProps),
            $_$('div', mergeStrProps({
                    class: 'panel panel-default clearfix ',
                }, panelProps),
                headingFunc(heading) +
                bodyFunc(body)
            )
        );
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
            const tabID = $(tabHeader).children('a').attr('href');
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

        const selectElt = $body.children('select');
        const ckbxElt = $body.children('input[type=checkbox]');
        const cbkxWrapper = $body.children('.cenarius-checkbox-wrapper');
        const alertElt = $body.children('div.alert');
        const textareaElt = $body.children('textarea');
        let includeTitle = $(parent).attr('titleInSummary');
        if (!isSet(includeTitle))
            includeTitle = true;

        const eltExists = (selRes) => {
            return selRes.length > 0;
        };

        const igas = $body.children('span.input-group-addon');
        let title = $(igas[0]).text();
        let val = '';
        let ending = igas.length > 1 ? $(igas[1]).text() : '';
        let addPeriod = true;

        if (eltExists(alertElt)) {
            val = $(alertElt).text();
        } else if (eltExists(selectElt)) {
            val = $(selectElt).val();
        } else if (eltExists(ckbxElt)) {
            // Regular checkbox field
            if ($(ckbxElt).prop('checked')) {
                if (eltExists(cbkxWrapper)) {
                    const $wrapperSpan = $($(cbkxWrapper).children('span'));
                    title = $wrapperSpan.children('span.input-group-addon').text();
                    val = $wrapperSpan.children('input').val();
                } else {
                    title = $body.children('.cenarius-ckbx-lbl').text();
                    val = 'yes';
                }
            }
        } else if (eltExists(textareaElt)) {
            val = $(textareaElt).val();
            addPeriod = false;

            // Do not inlcude counter text
            if ($(igas[1]).attr('name') === 'textarea-counter')
                ending = '';
        } else {
            // Regular input field
            val = $body.children('input').val();
        }

        if (ending.length > 0)
            ending = ' ' + ending;
        return (includeTitle ? (title + ': ') : '') + val + ending + (addPeriod ? '. ' : '');
    };

    visitDomNode(dom) {
        const $dom = $(dom);
        const skip = $dom.attr('excludeFromSummary');
        if (isSet(skip) && skip)
            return '';

        const domName = $dom.attr('name');
        const breakStyle = $dom.attr('summaryBreakStyle');
        const brBefore = breakStyle === 'before' ? '<br>' : '';
        const brAfter = breakStyle === 'after' ? '<br>' : '';

        switch (domName) {
            case 'cenarius-object-group':
                {
                    return brBefore + this.genObjectGroup(dom) + brAfter;
                }
            case 'cenarius-subobject-group':
                {
                    return brBefore + this.genSubobjectGroup(dom) + brAfter;
                }
            case 'cenarius-single-choice-group':
                {
                    return brBefore + this.genSingleChoiceGroup(dom) + brAfter;
                }
            case 'cenarius-multi-choice-group':
                {
                    return brBefore + this.genMultiChoiceGroup(dom) + brAfter;
                }
            case 'cenarius-either-group':
                {
                    return brBefore + this.genEitherGroup(dom) + brAfter;
                }
            case 'cenarius-input-group':
                {
                    return brBefore + this.genInputGroup(dom) + brAfter;
                }
            default:
                {
                    alert('[CenariusFormError]: Unknown DOM name found (' + domName + '): ' + $(dom).html())
                    return 'ERROR';
                }
        }
    };

    static gen(cenariusForm) {
        let mySG = new SummaryGenerator();

        const mainCol = $(cenariusForm).children()[0];
        const summary = mapJoin($(mainCol).children(), function(group) {
            return mySG.visitDomNode(group);
        });

        return $_$('p', {}, summary);
    };
}

class SQLSchemaGenerator {
    constructor(tableName) {
        this.tables = [{
            tableName: tableName,
            fields: []
        }];
        this.mainTableName = tableName;
    }

    visitFormaNode(node, key, dest) {
        let sqlGenSelf = this;
        const next = node[key];
        const type = next._type;
        const parentTableName = dest.tableName;

        if (next.hasOwnProperty('_sql_type')) {
            if (next._sql_type === 'subobject') {
                const soTable = {
                    tableName: next._fieldID.replace(/_subobject_f[0-9]*$/, '_subobject_of_' + parentTableName),
                    fields: [{
                        name: parentTableName + '_ref',
                        sqlType: ''
                    }]
                }
                this.tables.push(soTable);
                dest = this.tables.last();
            } else {
                dest.fields.push({
                    name: next._fieldID,
                    sqlType: next._sql_type
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

    static gen(forma, tableName) {
        let sqlGen = new SQLSchemaGenerator(tableName);

        _.each(Object.keys(forma), function(key) {
            sqlGen.visitFormaNode(forma, key, sqlGen.tables[0]);
        })

        return sqlGen.tables;
    }
}

function main(global, $) {
    $.fn.cenarius = function(headingText, options) {
        myForma = options.forma;
        let myFG = new FormGenerator();

        const formaHtml =
            mapJoin(Object.keys(myForma),
                function(key) {
                    return myFG.visitFormaNode(myForma, key);
                }
            );

        const contentHtml = Htmler.genContentHtml(headingText, formaHtml);

        const ctrlHtml = Htmler.genCtrlPanel();

        const summaryModalHtml = Htmler.genSummaryModalHtml();

        const sqlModalHtml = Htmler.genSQLModalHtml();

        const finalHtml =
            $_$('div', {
                    id: 'bootstrap-overrides'
                },
                contentHtml + ctrlHtml + summaryModalHtml + sqlModalHtml
            );

        this.replaceWith(finalHtml);
    }

    $.fn.sortByDepth = function() {
        return $(this).sort(function(a, b) {
            return $(b).parents().length - $(a).parents().length;
        });
    };
};



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
            idStr = idStr.substr(idStrTmplIdx + '_template_'.length);

        // Remove everything after the stat of the instance token
        const idStrInstIdx = idStr.indexOf('_instance-');
        if (idStrInstIdx > 0)
            idStr = idStr.substr(0, idStrInstIdx);

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
        if (typeof fieldVal !== typeof undefined && fieldVal !== false) {
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

    $tabHeaders.append(Htmler.genTabRef(cloneID, '#' + cloneIndex, {
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

function $_$(tag, attr = {}, content = '', close = true) {
    function genAttrStr(data) {
        return mapJoin(Object.getOwnPropertyNames(data),
            (field) => {
                const val = data[field];
                return ' ' +
                    (_.isUndefined(val) ? field : (field + '=\"' + val + '\"'));
            }
        );
    }
    return '<' + tag + genAttrStr(attr) + '>' +
        content +
        (close ? ('</' + tag + '>') : '');
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
    return str.replace(/[^a-z0-9]/g, function(s) {
        var c = s.charCodeAt(0);
        if (c == 32) return '-';
        if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
        return '__' + ('000' + c.toString(16)).slice(-4);
    }).substr(1);
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
            const sqlSchema = SQLSchemaGenerator.gen(myForma, tableName);
            $sql.html($_$('pre', {}, JSON.stringify(sqlSchema, null, 2)));
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
            alert('Copied to clipboard.');
        else
            alert('Browser does not support copy function.');
    });

    $('#copy_sql_btn').click(function(e) {
        e.stopPropagation();
        const res = copyToClipboard($(this).parent().siblings('.modal-body').children('pre')[0]);
        if (res)
            alert('Copied to clipboard.');
        else
            alert('Browser does not support copy function.');
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
        $(counterSpan).html(valLen + oldCounter.substr(oldCounter.indexOf('<br>')));
    });

    $('.format-control').keyup(function() {
        inputToggleCheckbox(this);
    });

    $('.format-control').change(function() {
        inputToggleCheckbox(this);
    });

    $('input[type=checkbox].single-choice-checkbox').change(function() {
        singleChoiceToggle(this);
    });
});