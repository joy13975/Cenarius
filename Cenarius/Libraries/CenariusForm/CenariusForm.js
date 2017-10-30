/* 
        A library that reads Cenarius-flavoured JSON and produces:
            1. The web form as described
            2. The SQL table schema 
            
        Author: Joy Yeh
        Inspired by Joshfire's JsonForms
        */
'use strict';

var config = {
    defaultType: "string",
    inferObjectFromProps: true,
    defaultTitle: "key_titleize",
    titleOptions: [
        "key_titleize",
        "key_lower_case",
        "key_upper_case",
        "key"
    ],

    autoCheckboxOptions: [
        "none",
        "single",
        "multi"
    ],
    defaultNumberStep: 0.01,
    autoLabelColon: '',
    autoLabelSpace: '',
    defaultEnumOptionText: '--',

    ui: {
        enumSingle: "dropdown",
        enumMulti: "checkboxes",
        subobject: "tabs-editable",
        eitherGroup: "tabs",
    },

    nCols: {
        object: '12',
        subobject: '12',
        enum: '6',
        complexEnum: '12',
        input: '6'
    },

    minSubobjectInstance: 1
};
const _space = '&nbsp;';
const nullStm = () => {};
let forma = '';


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
        return (key + '_f' + (this.fieldID++).toString());
    }

    genObj(node, key, name, sandwich) {
        console.log('genObj()');

        const extraHtmlClass = node.hasOwnProperty('_html_class') ?
            node._html_class : '';
        const nCols = node.hasOwnProperty('_cols') ?
            node._cols : config.nCols.object;
        const fieldID = this.getNextID(key + '_grouping');
        const needTabs = node.hasOwnProperty('_grouping') && node._grouping === 'either';

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
        return Htmler.genPanel(name + helpAlert, html,
            nCols, {
                name: 'cenarius-object-group'
            }, {
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

        const panelBody =
            $_$('ul', {
                class: 'nav nav-tabs',
                name: "subobject-tabheaders",
                id: fieldID + '_tabs'
            }) +
            $_$('div', {
                    class: 'tab-content col-md-12',
                    name: "subobject-tabcontent"
                },
                Htmler.genTabPane(fieldID + '_template', sandwich(), {
                    'skip-in-summary': undefined
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

        return Htmler.genPanel(name + helpAlert,
            panelBody,
            nCols, {
                name: 'cenarius-subobject-group'
            }, {
                class: extraHtmlClass
            }, panelHeadingFunc);
    };

    genEnum(nodeParent, node, key, name, sandwich) {
        console.log('genEnum()');

        let formGenSelf = this;

        const isMultiChoice = node.hasOwnProperty("_enum_multi");

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

        const fieldID = this.getNextID(key);
        const forceCheckbox = node.hasOwnProperty('_force_checkbox') && node._force_checkbox;
        const needCheckbox = this.forceCheckbox !== 'none' || forceCheckbox;
        const checkboxID = fieldID + '_ckbx';

        let html = '';
        if (simpleEnum) {
            const enumHtml =
                $_$('span', {
                        class: 'input-group-addon cenarius-input-tag'
                    },
                    $_$('b', {}, name + config.autoLabelColon + config.autoLabelSpace)
                ) +
                $_$('select', {
                        class: 'selectpicker form-control',
                        id: fieldID,
                        'data-live-search': true,
                        onchange: 'inputToggleCheckbox(this);'
                    },
                    $_$('option', {
                        selected: undefined,
                        isDefaultOption: true
                    }, config.defaultEnumOptionText) +
                    mapJoin(enumData, (item) => {
                        return $_$('option', {
                            isDefaultOption: false
                        }, item);
                    })
                );

            html =
                $_$('div', {
                    class: 'col-md-' + nCols + ' ' + extraHtmlClass,
                    name: 'cenarius-input-group'
                }, $_$('div', {
                    class: 'input-group'
                }, needCheckbox ? Htmler.genCheckboxWrapper(checkboxID, this.forceCheckbox, enumHtml) : enumHtml));
        } else {
            const choiceTypeIcon =
                $_$('span', {
                    class: 'pull-right glyphicon glyphicon-tag' + (isMultiChoice ? 's' : ''),
                    name: 'choice-type-icon'
                });

            this.setForceCheckbox(isMultiChoice);

            html =
                Htmler.genPanel(name + choiceTypeIcon,
                    sandwich(),
                    nCols, {
                        name: isMultiChoice ? 'cenarius-multi-choice-group' : 'cenarius-single-choice-group'
                    }, {
                        class: extraHtmlClass
                    }
                );
            this.unsetForceCheckbox();
        }

        return html;
    };

    genLeaf(nodeParent, node, type, key, name) {
        console.log('genLeaf()');

        let inputTag = 'input';
        let inputType;
        let numStep = '';

        switch (type) {
            case 'number':
                {
                    inputType = 'number';
                    numStep = node.hasOwnProperty('_number_step') ?
                    node._number_step : config.defaultNumberStep;
                    break;
                }
            case 'integer':
                {
                    inputType = 'number';
                    numStep = 1;
                    break;
                }
            case 'big_string':
                {
                    inputTag = 'textarea';
                }
            case 'string':
                {
                    inputType = 'text';
                    break;
                }
            case 'boolean':
                {
                    inputType = 'checkbox';
                    break;
                }
            default:
                {
                    inputType = type;
                    console.log('Warning: abnormal field type "' + type + '"');
                    break;
                }
        }

        const numMin = node.hasOwnProperty('_min') ? node._min : '';
        const numMax = node.hasOwnProperty('_max') ? node._max : '';

        // Default value
        let defaultValue = node.hasOwnProperty('_default_value') ? node._default_value : '';
        if (defaultValue === '') {
            if (inputType === 'number') {
                defaultValue = '0';
            } else if (inputType === 'date') {
                defaultValue = (new Date()).toISOString().slice(0, 10);
            }
        }

        const isTextArea = inputTag === 'textarea';
        const textAlignment = isTextArea ? '' : 'text-align: right; ';
        const textAreaRows = isTextArea ?
            (node.hasOwnProperty('_textarea_rows') ? node._textarea_rows : '5') : '';

        const fieldStyle = textAlignment;
        const fieldID = this.getNextID(key);
        const fieldName = name + config.autoLabelColon + config.autoLabelSpace;
        const forceCheckbox = node.hasOwnProperty('_force_checkbox') && node._force_checkbox;
        const needCheckbox = this.forceCheckbox !== 'none' || forceCheckbox;
        const endingSpan = node.hasOwnProperty('_ending') ?
            $_$('span', {
                class: 'input-group-addon cenarius-input-tag'
            }, node._ending) : '';

        const checkboxID = fieldID + '_ckbx';


        // Generate the field html which might include an input addon and an ending
        const inputHtml =
            (() => {
                switch (inputType) {
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
                                $_$('input', {
                                        type: 'checkbox',
                                        name: fieldID,
                                        id: fieldID,
                                        autocomplete: 'off',
                                        onchange: this.forceCheckbox === 'single' ? 'singleChoiceToggle(this);' : ''
                                    },
                                    $_$('label', {
                                        for: fieldID,
                                        class: 'btn btn-default cenarius-ckbx-lbl'
                                    }, name) +
                                    $_$('label', {
                                            for: fieldID,
                                            class: 'btn btn-default cenarius-ckbx-btn checkbox-displayer'
                                        },
                                        $_$('span', {
                                            class: 'glyphicon glyphicon-ok cenarius-chbkx-icon'
                                        }) +
                                        $_$('span', {}, _space)
                                    )
                                );

                            return html;
                        }
                    case 'text':
                    case 'number':
                    case 'date':
                        {
                            const checkboxToggleJS = 'inputToggleCheckbox(this);';
                            const fieldHtml =
                                $_$('span', {
                                        class: 'input-group-addon cenarius-input-tag'
                                    },
                                    $_$('b', {}, fieldName)) +
                                $_$(inputTag, (() => {
                                    let inputAttr = {
                                        class: 'form-control',
                                        style: fieldStyle,
                                        id: fieldID,
                                        type: inputType,
                                        onkeyup: checkboxToggleJS,
                                        onchange: checkboxToggleJS,
                                        step: numStep,
                                        defaultValue: defaultValue,
                                        value: defaultValue
                                    };
                                    numMin === '' ? nullStm() : (inputAttr.min = numMin);
                                    numMax === '' ? nullStm() : (inputAttr.max = numMax);
                                    defaultValue === '' ? nullStm() : (inputAttr.value = defaultValue);
                                    textAreaRows === '' ? nullStm() : (inputAttr.rows = textAreaRows);
                                    return inputAttr;
                                })(), '', isTextArea) +
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
                            return $_$('p', $_$('b', '[CenariusFormError] Unknown field type: ' + inputType));
                        }
                }
            })();

        const nCols = node.hasOwnProperty('_cols') ? node._cols :
            this.currentDefaultNCols !== '' ? this.currentDefaultNCols :
            config.nCols.input;
        const extraHtmlClass = node.hasOwnProperty('_html_class') ?
            node._html_class : '';

        const html =
            $_$('div', {
                    class: 'col-md-' + nCols + ' ' + extraHtmlClass,
                    name: 'cenarius-input-group'
                },
                $_$('div', {
                    class: 'input-group',
                    style: 'width: 100% !important'
                }, inputHtml)
            );

        return html;
    };

    visitFormaNode(node, key) {
        let formGenSelf = this;
        const next = node[key];

        // Extract flags
        let name;
        if (next.hasOwnProperty('_title')) name = next._title;
        else if (typeof next === 'string') name = next;
        else name = getNameFromKey(key);

        const hasProps = next.hasOwnProperty('_properties');
        const children = hasProps ? next._properties :
            next.hasOwnProperty('_enum') ? next._enum :
            next.hasOwnProperty('_enum_multi') ? next._enum_multi : {};

        const isMultiChoice = next.hasOwnProperty('_enum_multi');
        const type = (next.hasOwnProperty('_type') ? next._type :
            (next.hasOwnProperty('_enum') || isMultiChoice ? 'enum' :
                (hasProps && config.inferObjectFromProps ? 'object' :
                    formGenSelf.currentDefaultType)));

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
                    name: checkboxID,
                    id: checkboxID,
                    autocomplete: 'off',
                    onchange: checkboxType === 'single' ? 'singleChoiceToggle(this);' : ''
                },
                $_$('span', {
                        style: 'width:100%; display: table-cell',
                        class: 'cenarius-checkbox-wrapper'
                    },
                    $_$('span', {
                        style: 'width:100%; min-height: 34px; display: table'
                    }, fieldHtml)
                ) +
                $_$('label', {
                        for: checkboxID,
                        class: 'btn btn-default cenarius-ckbx-btn checkbox-displayer'
                    },
                    $_$('span', {
                        class: 'glyphicon glyphicon-ok cenarius-chbkx-icon'
                    })
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
                        name: 'cenarius-header'
                    },
                    $_$('h1', {}, headingText)
                ) +
                $_$('div', {
                        class: 'row',
                        name: 'cenarius-form'
                    },
                    $_$('div', {
                        class: 'col-md-12'
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
                        class: 'btn btn-primary btn-lg',
                        name: 'submit_btn'
                    },
                    $_$('span', {
                        class: 'glyphicon glyphicon-send'
                    }) +
                    _space + _space + _space + 'Submit'
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
                )
            );

        return html;
    };

    static genSummaryModalHtml() {
        const html =
            $_$('div', {
                    class: 'modal fade',
                    id: 'summary_modal',
                    role: 'dialog'
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
                        Htmler.genPanel('Comment', $_$('textarea', {
                            class: 'form-control',
                            style: 'min-height: 10vh'
                        }), 12, {
                            style: 'padding: 0'
                        }, {
                            style: 'border-radius: 0px; '
                        }) +
                        $_$('div', {
                                class: 'modal-footer'
                            },
                            $_$('button', {
                                    type: 'button',
                                    class: 'btn btn-default',
                                    'data-dismiss': 'modal'
                                },
                                'Close'
                            ) +
                            $_$('button', {
                                    type: 'button',
                                    class: 'btn btn-primary',
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
    constructor() {
        this.indentEach = '....';
        this.indentLvl = 0;
    };

    indent(i = this.indentLvl) {
        return i <= 0 ? '' : (this.indentEach + this.indent(i - 1));
    };

    getPlainText(ph) {
        return $(ph).clone() //clone the element
            .children() //select all the children
            .remove() //remove all the children
            .end() //again go back to selected element
            .text();
    }

    genObjectGroup(parent) {
        const sgSelf = this;
        const panelHeading = $(parent).children('.panel').children('.panel-heading');
        const name = this.getPlainText(panelHeading);
        const body = $(parent).children('.panel').children('.panel-body');

        let str = this.indent() + 'OG::' + name + ' {<br/>';

        this.indentLvl++;
        const subdoms = $(body).children();
        for (let i = 0; i < subdoms.length; i++) {
            str += sgSelf.visitDomNode(subdoms[i], i < subdoms.length - 1);
        }
        this.indentLvl--;

        return str + '<br/>' + this.indent() + '}';
    };

    genSubobjectGroup(parent) {
        const sgSelf = this;
        const panelHeading = $(parent).children('.panel').children('.panel-heading');
        const name = this.getPlainText(panelHeading);
        const tabs = $(parent).children('.panel')
            .children('.panel-body').children('div[name=subobject-tabcontent]')
            .children('.tab-pane:not([skip-in-summary])');

        let str = this.indent() + 'SOG::' + name + ' {<br/>';

        this.indentLvl++;
        str += mapJoin(tabs, function(tab) {
            return mapJoin($(tab).children(), function(tabContent) {
                return $(tabContent).prop('id') + sgSelf.visitDomNode(tabContent, false);
            });
        });
        this.indentLvl--;

        return str + '<br/>' + this.indent() + '}';
    };

    genSingleChoiceGroup(parent) {
        const sgSelf = this;
        const panelHeading = $(parent).children('.panel').children('.panel-heading');
        const name = this.getPlainText(panelHeading);
        const ckbx = $(parent).children('.panel').children('.panel-body')
            .find('div[name=cenarius-input-group] > div.input-group > input[type=checkbox]:checked');

        let str = name + ' is ';
        if (ckbx.length == 0) {
            str += 'unknown (not selected). ';
        } else {
            const lbl = $(ckbx).siblings('label.cenarius-ckbx-lbl');
            let value = '';
            if (lbl.length > 0) {
                value = lbl.text();
            } else {
                // Checkbox-wrapped regular input field
                const $wrapperSpan = $($(ckbx).siblings('span.cenarius-checkbox-wrapper').children('span'));
                value = $wrapperSpan.children('span.input-group-addon').text() +
                    ' (' + $wrapperSpan.children('input').val() + ')';
            }
            str += value + '. ';
        }

        return str;
    };

    genMultiChoiceGroup(parent) {
        const sgSelf = this;
        const panelHeading = $(parent).children('.panel').children('.panel-heading');
        const name = this.getPlainText(panelHeading);
        const ckbxs = $(parent).children('.panel').children('.panel-body')
            .find('div[name=cenarius-input-group] > div.input-group > input[type=checkbox]:checked');

        let str = name + ' is ';
        if (ckbxs.length == 0) {
            str += 'unknown (not selected). ';
        } else {
            str += mapJoin($(ckbxs), function(ckbx) {
                const lbl = $(ckbx).siblings('label.cenarius-ckbx-lbl');
                if (lbl.length > 0) {
                    return lbl.text();
                } else {
                    // Checkbox-wrapped regular input field
                    const $wrapperSpan = $($(ckbx).siblings('span.cenarius-checkbox-wrapper').children('span'));
                    return $wrapperSpan.children('span.input-group-addon').text() +
                        ' (' + $wrapperSpan.children('input').val() + ')';
                }
            }, ', ') + '. ';
        }

        return str;
    };

    genEitherGroup(parent) {
        const sgSelf = this;
        const activeTab = $(parent).children('div[name=cenarius-either-group-tabcontent]')
            .children('.tab-pane.active')
        const activeTabRef = $(parent).children('ul[name=cenarius-either-group-tabheaders]')
            .children('li.active');
        const activeTabName = this.getPlainText(activeTabRef);


        let str = this.indent() + 'EG::' + activeTabName + ' {<br/>';

        this.indentLvl++;
        const tabContent = $(activeTab).children();
        for (let i = 0; i < tabContent.length; i++) {
            str += sgSelf.visitDomNode(tabContent[i], i < tabContent.length - 1);
        }
        this.indentLvl--;

        return str + '<br/>' + this.indent() + '}';
    };

    genInputGroup(parent) {
        const sgSelf = this;
        const $body = $($(parent).children('.input-group'));

        const selectElt = $body.children('select');
        const ckbxElt = $body.children('input[type=checkbox]');
        const cbkxWrapper = $body.children('.cenarius-checkbox-wrapper');

        const eltExists = (selRes) => {
            return selRes.length > 0;
        };

        let str = '';
        if (eltExists(selectElt)) {
            str += $body.children('.cenarius-input-tag').text() + ' is ' + $(selectElt).val() + '. ';
        } else if (eltExists(ckbxElt)) {
            // Regular checkbox field
            if ($(ckbxElt).prop('checked')) {
                if (eltExists(cbkxWrapper)) {
                    // If this field is not wrapper in a multi-choice-group or a single-choice-group
                    // then it need only be stringified if the ckbx is checked
                    const $wrapperSpan = $($(cbkxWrapper).children('span'));
                    str += $wrapperSpan.children('span.input-group-addon').text() +
                        ' (' + $wrapperSpan.children('input').val() + '). ';
                } else {
                    str += $body.children('.cenarius-ckbx-lbl').text() + '. ';
                }
            }
        } else {
            // Regular input field
            str += mapJoin($body.children(), function(subdom) {
                return $(subdom).text() + '. ';
            });
        }

        return str;
    };

    visitDomNode(dom, appendNL = true) {
        const $dom = $(dom);
        const domName = $dom.attr('name');
        const nl = appendNL ? '<br/>' : '';

        switch (domName) {
            case 'cenarius-object-group':
                {
                    return this.genObjectGroup(dom) + nl;
                }
            case 'cenarius-subobject-group':
                {
                    return this.genSubobjectGroup(dom) + nl;
                }
            case 'cenarius-single-choice-group':
                {
                    return this.genSingleChoiceGroup(dom) + nl;
                }
            case 'cenarius-multi-choice-group':
                {
                    return this.genMultiChoiceGroup(dom) + nl;
                }
            case 'cenarius-either-group':
                {
                    return this.genEitherGroup(dom) + nl;
                }
            case 'cenarius-input-group':
                {
                    return this.genInputGroup(dom);
                }
            default:
                {
                    alert('[CenariusFormError]: Unknown DOM name found (' + domName + '): ' + $(dom).html())
                    return 'ERROR';
                }
        }
    };
}

function main(global, $) {
    $.fn.cenarius = function(headingText, options) {
        forma = options.forma;
        let myFG = new FormGenerator();

        const formaHtml =
            mapJoin(Object.keys(forma),
                function(groupKey) {
                    return myFG.visitFormaNode(forma, groupKey);
                }
            );

        const contentHtml = Htmler.genContentHtml(headingText, formaHtml);

        const ctrlHtml = Htmler.genCtrlPanel();

        const summaryModalHtml = Htmler.genSummaryModalHtml();

        const finalHtml =
            $_$('div', {
                    id: 'bootstrap-overrides'
                },
                contentHtml + ctrlHtml + summaryModalHtml
            );

        this.replaceWith(finalHtml);
    }
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
    const templateID = tabID.substr(0, tabID.length - 5) + '_template';
    let $tabContent = ($tabHeaders.siblings('div[name=subobject-tabcontent]'));
    const template = $tabContent.children('#' + templateID);

    // Clone template
    let clone = template.clone();
    let cloneIndex = 0;
    template.parent().children().each(function() {
        const idStr = $(this).prop('id');
        const id = parseInt(idStr.substr(idStr.lastIndexOf('_') + 1), 10);
        cloneIndex = id > cloneIndex ? id : cloneIndex;
    });
    cloneIndex += 1;

    // Fix cloned element IDs
    const cloneID = templateID + '_' + cloneIndex;

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
                // console.log('Fix ' + fieldName + '}' + fieldVal + 'n-> ' + valGenFunc(node, fieldVal, '_template_' + cloneIndex));
                node.prop(fieldName, valGenFunc(node, fieldVal, '_template_' + cloneIndex));
            }
        }
    }

    descendAll(clone, function(node) {
        fixCloneField(node, 'id');
        fixCloneField(node, 'name');
        fixCloneField(node, 'for');
        fixCloneField(node, 'href');
    });

    // Remove skip-in-summary attr
    $(clone).removeAttr('skip-in-summary');

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


function summarizeForm(cenariusForm) {
    let inSingleChoiceGroup = false;
    let inMultiChoiceGroup = false;

    let mySG = new SummaryGenerator();

    const mainCol = $(cenariusForm).children()[0];
    const summary = mapJoin($(mainCol).children(), function(group) {
        return mySG.visitDomNode(group) + '<br/>';
    });

    return $_$('p', {}, summary);
};

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
        case "key_titleize":
            {
                return titleize(key.replaceAll('_', ' '));
            }
        case "key_lower_case":
            {
                return key.replace('_', ' ').toLowerCase();
            }
        case "key_upper_case":
            {
                return key.replace('_', ' ').toUpperCase();
            }
        case "key":
            {
                return key;
            }
        default:
            {
                return "invalid_default_name_config";
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

function isSet(value) {
    return !(_.isUndefined(value) || _.isNull(value));
};

main(window, ((typeof jQuery !== 'undefined') ? jQuery : {
    fn: {}
}));

$(() => { /* DOM ready */
    // Spawn one instance of each suboject using their template
    $('ul[name=subobject-tabheaders]').each(function(index) {
        spawnMinimumSubobjectInstances($(this));
    });

    // Fix button stuck in focus
    $(".btn").click(function(event) {
        $(this).blur();
    });

    $("button[name=del_tab_btn]").click(function() {
        if (confirm('Confirm delete?')) {
            let tabHeaders = $(this).parent().parent().siblings('.panel-body').children('ul[name=subobject-tabheaders]');
            delSubobjectInstance(tabHeaders);
            spawnMinimumSubobjectInstances(tabHeaders);
        }
    })

    $("button[name=new_tab_btn]").click(function() {
        addSubobjectInstance($(this).parent().parent().siblings('.panel-body').children('ul[name=subobject-tabheaders]'));
    })

    $("button[name=reset_btn]").click(function() {
        if (confirm('Are you sure you want to reset (clear) all fields?')) {
            resetAllFields();
        }
    });

    $("button[name=summarize_btn]").click(function() {
        let $summary = $('#summary_modal .modal-dialog .modal-content .modal-body');
        const summaryHtml = summarizeForm($(this).parent().siblings('div[name=cenarius-content]').children('div[name=cenarius-form]'));
        $summary.html(summaryHtml);
    })
});