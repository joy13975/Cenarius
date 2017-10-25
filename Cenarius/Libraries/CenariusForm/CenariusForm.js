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

    globalCheckBoxType: "none",
    autoCheckboxOptions: [
        "none",
        "single",
        "multi"
    ],
    defaultNumberStep: 0.01,
    autoLabelColon: false,
    autoLabelSpace: false,

    enumSingleUI: "dropdown",
    enumMultiUI: "checkboxes",
    subobjectUI: "tabs-editable",
    eitherGroupUI: "tabs",

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

((global, $) => 　{
    const fieldColon = config.autoLabelColon ? ':' : '';
    const fieldSpace = config.autoLabelSpace ? _space : '';

    class Core {
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
            this.forceCheckbox = false;
        }

        setForceCheckbox() {
            console.log('setForceCheckbox()');
            this.forceCheckbox = true;
        }

        getNextID(key) {
            return (key + '_f' + (this.fieldID++).toString());
        }

        genObj(node, name, sandwitch) {
            console.log('genObj()');

            // Html class
            const extraHtmlClass = node.hasOwnProperty('_html_class') ?
                node._html_class : '';
            const nCols = node.hasOwnProperty('_cols') ?
                node._cols : config.nCols.object;

            const html =
                $_$('div', {
                        class: 'col-sm-' + nCols
                    },
                    genNameTag(name, 'default') +
                    $_$('div', {
                            class: 'cenarius-group cenarius-default-border col-sm-12' + extraHtmlClass
                        },
                        sandwitch()
                    )
                );

            return html;
        };

        genSubobj(node, key, name, sandwitch) {
            console.log('genSubobj()');

            // Html class
            const extraHtmlClass = node.hasOwnProperty('_html_class') ?
                node._html_class : '';
            const nCols = node.hasOwnProperty('_cols') ?
                node._cols : config.nCols.subobject;
            const fieldID = this.getNextID(key + '_so1');

            const html = $_$('div', {
                    class: 'col-sm-' + nCols
                },
                genNameTag(name, 'danger') +
                $_$('div', {
                        class: 'cenarius-group cenarius-danger-border col-sm-12 ' + extraHtmlClass,
                        style: 'padding-left: 15px; padding-right: 15px;'
                    },
                    $_$('ul', {
                        class: 'nav nav-tabs" name="subobject_tabs" id="' + fieldID + '_tabs'
                    }) +
                    $_$('div', {
                            class: 'tab-content'
                        },
                        $_$('div', {
                                id: fieldID + '_template',
                                class: 'tab-pane'
                            },
                            $_$('div', {
                                    class: 'col-sm-12'
                                },
                                $_$('button', {
                                        type: 'button',
                                        class: 'btn btn-default btn-sm cenarius-del-tab-btn',
                                        name: 'del_tab_btn',
                                        onclick: 'delSubobjectInstance($(this).parent().parent().parent())'
                                    },
                                    $_$('span', {
                                        class: 'glyphicon glyphicon-remove'
                                    })
                                ) +
                                $_$('button', {
                                        type: 'button',
                                        class: 'btn btn-default btn-sm cenarius-new-tab-btn',
                                        name: 'new_tab_btn',
                                        onclick: 'addSubobjectInstance($(this).parent().parent().parent().siblings(\'ul[name=subobject_tabs]\'))'
                                    },
                                    $_$('span', {
                                        class: 'glyphicon glyphicon-plus'
                                    })
                                )
                            ) +
                            sandwitch()
                        )
                    )
                )
            );

            return html;
        };

        genEnum(node, key, name, sandwitch) {
            console.log('genEnum()');

            let coreSelf = this;

            const isMultiChoice = node.hasOwnProperty("_enum_multi");

            let enumData = [];
            let simpleEnum = true;

            if (isMultiChoice) {
                enumData = node._enum_multi;
                simpleEnum = false;
            } else {
                enumData = node._enum;
                _.each(enumData, (item) => {
                    simpleEnum &= typeof item != 'object';
                    if (!simpleEnum)
                        console.log('enum is complex because of: ' + typeof item);
                });
            }

            // Html class
            const extraHtmlClass = node.hasOwnProperty('_html_class') ?
                node._html_class : '';
            const nCols = node.hasOwnProperty('_cols') ? node._cols :
                this.currentDefaultNCols != '' ? this.currentDefaultNCols :
                simpleEnum ? config.nCols.enum :
                config.nCols.complexEnum;

            const fieldID = this.getNextID(key);
            const isForceCheckbox = this.forceCheckbox ||
                (node.hasOwnProperty('_force_checkbox') && node._force_checkbox);
            const checkboxID = fieldID + '_ckbx';

            let html = '';
            if (simpleEnum) {
                const enumHtml =
                    $_$('span', {
                            class: 'input-group-addon cenarius-input-tag'
                        },
                        $_$('b', {}, name + fieldColon + fieldSpace)
                    ) +
                    $_$('select', {
                            class: 'selectpicker form-control',
                            id: fieldID,
                            'data-live-search': true,
                            onchange: 'setCheckbox(\'' + checkboxID + '\', selectedIndex != 0);'
                        },
                        $_$('option', {
                            selected: undefined
                        }, ' -- ') +
                        mapJoin(enumData, (item) => {
                            return $_$('option', {}, item);
                        })
                    );

                const checkboxWrappingHtml = (innerEnumHtml) => {
                    const resHtml =
                        $_$('input', {
                                type: 'checkbox',
                                name: checkboxID,
                                id: checkboxID,
                                autocomplete: 'off'
                            },
                            $_$('label', {
                                    for: checkboxID,
                                    class: 'btn btn-default cenarius-ckbx-btn'
                                },
                                $_$('span', {
                                    class: 'glyphicon glyphicon-ok cenarius-chbkx-icon'
                                }) +
                                $_$('span', _space)
                            ) +
                            $_$('span', {
                                    style: 'width:100%; display: table-cell'
                                },
                                $_$('span', {
                                    style: 'width:100%; display: table'
                                }, innerEnumHtml))
                        );
                    return resHtml;
                };

                html += $_$('div', {
                    class: 'cenarius-input-wrapper col-sm-' + nCols + ' ' + extraHtmlClass
                }, $_$('div', {
                    class: 'input-group'
                }, isForceCheckbox ? checkboxWrappingHtml(enumHtml) : enumHtml));
            } else {
                const mcStr = isMultiChoice ? ' (multiple choice)' : ' (single choice)';

                this.setForceCheckbox();
                html += $_$('div', {
                        class: 'col-sm-' + nCols
                    }, genNameTag(name + mcStr, 'warning') +
                    $_$('div', {
                        class: 'cenarius-group cenarius-warning-border col-sm-12 ' + extraHtmlClass
                    }, (isMultiChoice ?
                        $_$('div', {
                            name: 'multi_choice_group'
                        }, sandwitch()) :
                        sandwitch())));
                this.unsetForceCheckbox();
            }

            return html;
        };

        genLeaf(node, type, key, name) {
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
            const defaultFieldValue = node.hasOwnProperty('_defaultValue') ?
                node._defaultValue : '';
            let defaultValue = '';
            if (inputType === 'number') {
                defaultValue = defaultFieldValue === '' ?
                    '0' : defaultFieldValue;
            } else if (inputType === 'date') {
                defaultValue = defaultFieldValue === '' ?
                    (new Date()).toISOString().slice(0, 10) : defaultFieldValue;
            }

            const isTextArea = inputTag === 'textarea';
            const textAlignment = isTextArea ? '' : 'text-align: right; ';
            const textAreaRows = isTextArea ?
                (node.hasOwnProperty('_textarea_rows') ? node._textarea_rows : '5') : '';

            const fieldStyle = textAlignment;
            const fieldID = this.getNextID(key);
            const fieldName = name + fieldColon + fieldSpace;
            const isForceCheckbox = this.forceCheckbox ||
                (node.hasOwnProperty('_force_checkbox') && node._force_checkbox);
            const endingSpan = node.hasOwnProperty('_ending') ?
                $_$('span', {
                    class: 'input-group-addon cenarius-input-tag'
                }, node._ending) : '';

            // Generate the field html which might include an input addon and an ending
            const inputHtml = (() => {
                switch (inputType) {
                    case 'checkbox':
                        {
                            const html =
                                $_$('input', {
                                        type: 'checkbox',
                                        name: fieldID,
                                        id: fieldID,
                                        autocomplete: 'off'
                                    }, $_$('label', {
                                            for: fieldID,
                                            class: 'btn btn-default cenarius-ckbx-btn'
                                        }, $_$('span', {
                                            class: 'glyphicon glyphicon-ok cenarius-chbkx-icon'
                                        }) +
                                        $_$('span', {}, _space)) +
                                    $_$('label', {
                                        for: fieldID,
                                        class: 'btn btn-default cenarius-ckbx-lbl'
                                    }, name));
                            return html;
                        }
                    case 'text':
                    case 'number':
                    case 'date':
                        {
                            const checkboxID = fieldID + '_ckbx';
                            const toggleCheckboxJS =
                                'setCheckbox(\'' + checkboxID + '\', $(this).val().length > 0);';
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
                                        onkeyup: toggleCheckboxJS,
                                        onchange: toggleCheckboxJS,
                                        step: numStep,
                                    };
                                    numMin === '' ? nullStm() : (inputAttr.min = numMin);
                                    numMax === '' ? nullStm() : (inputAttr.max = numMax);
                                    defaultValue === '' ? nullStm() : (inputAttr.value = defaultValue);
                                    textAreaRows === '' ? nullStm() : (inputAttr.rows = textAreaRows);
                                    return inputAttr;
                                })(), '', isTextArea) +
                                endingSpan;

                            if (isForceCheckbox) {
                                // This should only happen in complex lists
                                const html =
                                    $_$('input', {
                                            type: 'checkbox',
                                            name: fieldID + '_ckbx',
                                            id: fieldID + '_ckbx',
                                            autocomplete: 'off'
                                        },
                                        $_$('label', {
                                                for: fieldID,
                                                class: 'btn btn-default cenarius-ckbx-btn'
                                            },
                                            $_$('span', {
                                                class: 'glyphicon glyphicon-ok cenarius-chbkx-icon'
                                            }) +
                                            $_$('span', {}, _space)
                                        )
                                    ) +
                                    $_$('span', {
                                        style: 'width:100%; display: table-cell'
                                    }, $_$('div', {
                                        style: 'width:100%; min-height: 34px; display: table'
                                    }, fieldHtml));
                                return html;
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
                this.currentDefaultNCols != '' ? this.currentDefaultNCols :
                config.nCols.input;
            const extraHtmlClass = node.hasOwnProperty('_html_class') ?
                node._html_class : '';

            const html =
                $_$('div', {
                        class: 'cenarius-input-wrapper col-sm-' + nCols + ' ' + extraHtmlClass
                    },
                    $_$('div', {
                        class: 'input-group" style="width: 100% !important'
                    }, inputHtml)
                );

            return html;
        };
    };

    $.fn.cenariusForm = function(options) {
        let forma = options.forma;
        let myCore = new Core();

        function visitFormaNode(node, key) {
            const next = node[key];
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
                        myCore.currentDefaultType)));

            console.log('key: ' + key + ', name: ' + name + ', content: ' + next + ', type: ' + type);

            const defaultType = next.hasOwnProperty('_default_type') ? next._default_type :
                (type === 'enum' ? 'boolean' : 'string');

            const defaultNCols = next.hasOwnProperty('_default_cols') ? next._default_cols : '';

            function sandwitch() {
                return mapJoin(Object.keys(children),
                    (nextKey) => {
                        myCore.setDefaultType(defaultType);
                        myCore.setDefaultNCols(defaultNCols);

                        const resHtml = visitFormaNode(children, nextKey);

                        myCore.resetDefaultType();
                        myCore.resetDefaultNCols();

                        return resHtml;
                    }
                );
            };

            switch (type) {
                case 'object':
                    return myCore.genObj(next, name, sandwitch);
                case 'subobject':
                    return myCore.genSubobj(next, key, name, sandwitch);
                case 'enum':
                    return myCore.genEnum(next, key, name, sandwitch);
                default:
                    return myCore.genLeaf(next, type, key, name);
            }
        }

        if (!this.hasClass('row'))
            this.addClass('row');

        const formaHtml = mapJoin(Object.keys(forma),
            function(groupKey) {
                return visitFormaNode(forma, groupKey, true);
            }
        );


        this.append(formaHtml);
    }
})(window,
    ((typeof jQuery !== 'undefined') ? jQuery : {
        fn: {}
    }));

function mapJoin(obj, func) {
    return _.map(obj, func).join('');
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

function setCheckbox(id, val) {
    $('#' + id).prop('checked', val);
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

function genNameTag(name, flavour = 'default', nCols = 12, size = 26) {
    const html =
        $_$('div', {
                class: 'col-sm-' + nCols + ' cenarius-group-tag'
            },
            $_$('span', {
                    style: 'font-size:' + size + 'px'
                },
                $_$('span', {
                    class: 'label label-' + flavour
                }, name)
            )
        );
    return html;
}

function titleize(str) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt[0].toUpperCase() + txt.substring(1).toLowerCase();
    });
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

function isSet(value) {
    return !(_.isUndefined(value) || _.isNull(value));
};

function addSubobjectInstance(tabHeaders) {
    const tabID = tabHeaders.prop('id');
    const templateID = tabID.substr(0, tabID.length - 5) + '_template';
    let tabContent = tabHeaders.siblings('div.tab-content');
    const template = tabContent.children('#' + templateID);

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
                // console.log('Fix ' + fieldName + '::' + fieldVal + '\n-> ' + valGenFunc(node, fieldVal, '_template_' + cloneIndex));
                node.prop(fieldName, valGenFunc(node, fieldVal, '_template_' + cloneIndex));
            }
        }
    }

    descendAll(clone, function(node) {
        fixCloneField(node, 'id');
        fixCloneField(node, 'name');
        fixCloneField(node, 'for');


        const fixToggleCheckboxJS = (trigger) => {
            const onTriggerJS = node.attr('on' + trigger);
            if (typeof onTriggerJS !== typeof undefined && onTriggerJS !== false) {
                const oldCkbxID = node.prop('id').replace('_template_' + cloneIndex, '') + '_ckbx';
                const newCkbxID = node.prop('id').replace('_template_' + cloneIndex, '') +
                    '_ckbx_template_' + cloneIndex;
                node.attr('on' + trigger, onTriggerJS.replace(oldCkbxID, newCkbxID));
            }
        }
        fixToggleCheckboxJS('keyup');
        fixToggleCheckboxJS('change');
    });

    clone.prop('id', cloneID);
    tabContent.append(clone);

    // De-select the rest
    tabHeaders.children().removeClass('active in');
    tabContent.children().removeClass('active in');

    tabHeaders.append(
        $_$('li', {
            class: 'active'
        }, $_$('a', {
            'data-toggle': 'tab',
            href: '#' + cloneID,
            style: 'background: #ecc'
        }, $_$('b', {}, '#' + cloneIndex)))
    );

    $('#' + cloneID).addClass('active in');
}

function delSubobjectInstance(tabContent) {
    if (confirm('Confirm delete?')) {
        let tabHeaders = tabContent.siblings('ul.nav-tabs');
        tabHeaders.children('li.active').remove();
        tabContent.children('div.active.in').remove();

        spawnMinimumSubobjectInstances(tabHeaders, tabContent);

        // Set new active tab
        tabHeaders.children().last().addClass('active in');
        tabContent.children().last().addClass('active in');
    }
}

function spawnMinimumSubobjectInstances(tabHeaders, tabContent = tabHeaders.siblings('div.tab-content')) {
    while (tabContent.children().length - 1 < config.minSubobjectInstance) {
        addSubobjectInstance(tabHeaders);
    }
}

$(() => { /* DOM ready */
    // Spawn one instance of each suboject using their template
    $('ul[name=subobject_tabs]').each(function(index) {
        spawnMinimumSubobjectInstances($(this));
    });

    // Fix button stuck in focus
    $(".btn").click(function(event) {
        $(this).blur();
    });
});