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
    autoLabelColon: false,
    autoLabelSpace: false,

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

            // Html class
            const extraHtmlClass = node.hasOwnProperty('_html_class') ?
                node._html_class : '';
            const nCols = node.hasOwnProperty('_cols') ?
                node._cols : config.nCols.object;
            const fieldID = this.getNextID(key + '_grouping');
            const needTabs = node.hasOwnProperty('_grouping') && node._grouping === 'either';

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

                const tabHeaderStr = mapJoin(pages, (page) => {
                    return Htmler.genTabRef(identifierize(page.name) + '_groupingtab', page.name, page.attr);
                });

                const tabContentStr = mapJoin(pages, (page) => {
                    return Htmler.genTabPane(identifierize(page.name) + '_groupingtab', page.content, page.attr);
                })

                const tabsHtml =
                    $_$('ul', {
                            class: 'nav nav-tabs nav-justified" name="grouping_tabheaders" id="' + fieldID + '_tabs'
                        },
                        tabHeaderStr
                    ) +
                    $_$('div', {
                            class: 'tab-content',
                        },
                        tabContentStr
                    );
                return tabsHtml;
            }

            return Htmler.genPanel(name, needTabs ? genTabs(sandwich()) : sandwich(), extraHtmlClass, nCols);
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
                    name: "subobject_tabheaders",
                    id: fieldID + '_tabs'
                }) +
                $_$('div', {
                        class: 'tab-content',
                        name: "subobject_tabcontent"
                    },
                    Htmler.genTabPane(fieldID + '_template', sandwich())
                );

            const panelHeadingFunc = (heading) => {
                const subobjectHeading =
                    heading +
                    $_$('div', {
                            style: 'float: right'
                        },
                        $_$('button', {
                                type: 'button',
                                class: 'btn btn-default btn-md cenarius-del-tab-btn',
                                name: 'del_tab_btn',
                                onclick: 'delSubobjectInstance($(this).parent().parent().siblings(\'.panel-body\').children(\'ul[name=subobject_tabheaders]\')); '
                            },
                            $_$('span', {
                                class: 'glyphicon glyphicon-remove'
                            })
                        ) +
                        $_$('button', {
                                type: 'button',
                                class: 'btn btn-default btn-md cenarius-new-tab-btn',
                                name: 'new_tab_btn',
                                onclick: 'addSubobjectInstance($(this).parent().parent().siblings(\'.panel-body\').children(\'ul[name=subobject_tabheaders]\')); '
                            },
                            $_$('span', {
                                class: 'glyphicon glyphicon-plus'
                            })
                        )
                    );

                return Htmler.genPanelHeading(subobjectHeading);
            };

            return Htmler.genPanel(name, panelBody, extraHtmlClass, nCols, '', panelHeadingFunc);
        };

        genEnum(node, key, name, sandwich) {
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

                html =
                    $_$('div', {
                            class: 'cenarius-input-wrapper col-lg-' + nCols + ' ' + extraHtmlClass
                        },
                        $_$('div', {
                            class: 'input-group'
                        }, needCheckbox ? checkboxWrappingHtml(enumHtml) : enumHtml)
                    );
            } else {
                const mcStr = isMultiChoice ? ' (multiple choice)' : ' (single choice)';

                this.setForceCheckbox(isMultiChoice);
                const panelBody =
                    isMultiChoice ?
                    $_$('div', {
                            name: 'multi_choice_group'
                        },
                        sandwich()
                    ) :
                    sandwich();

                html = Htmler.genPanel(name + mcStr, panelBody, extraHtmlClass, nCols);
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
            const forceCheckbox = node.hasOwnProperty('_force_checkbox') && node._force_checkbox;
            const needCheckbox = this.forceCheckbox !== 'none' || forceCheckbox;
            const endingSpan = node.hasOwnProperty('_ending') ?
                $_$('span', {
                    class: 'input-group-addon cenarius-input-tag'
                }, node._ending) : '';

            const checkboxID = fieldID + '_ckbx';


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
                                        autocomplete: 'off',
                                        onchange: this.forceCheckbox === 'single' ? 'singleChoiceToggle($(this));' : ''
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
                            const checkboxToggleJS = 'setCheckbox(\'' + checkboxID + '\', $(this).val().length > 0);';
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
                                const checkboxID = fieldID + '_ckbx';
                                const html =
                                    $_$('input', {
                                            type: 'checkbox',
                                            name: checkboxID,
                                            id: checkboxID,
                                            autocomplete: 'off',
                                            onchange: this.forceCheckbox === 'single' ? 'singleChoiceToggle($(this));' : ''
                                        },
                                        $_$('label', {
                                                for: checkboxID,
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
                this.currentDefaultNCols !== '' ? this.currentDefaultNCols :
                config.nCols.input;
            const extraHtmlClass = node.hasOwnProperty('_html_class') ?
                node._html_class : '';

            const html =
                $_$('div', {
                        class: 'cenarius-input-wrapper col-lg-' + nCols + ' ' + extraHtmlClass
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

            function sandwich() {
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
                    return myCore.genObj(next, key, name, sandwich);
                case 'subobject':
                    return myCore.genSubobj(next, key, name, sandwich);
                case 'enum':
                    return myCore.genEnum(next, key, name, sandwich);
                default:
                    return myCore.genLeaf(next, type, key, name);
            }
        }

        if (!this.hasClass('row'))
            this.addClass('row');

        this.prop('id', 'bootstrap-overrides');

        const formaHtml =
            mapJoin(Object.keys(forma),
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

class Htmler {
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

    static genPanelHeading(content, styleStr = 'font-weight:bold; font-size: 20px; ') {
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

    static genPanel(heading, body, extraHtmlClass, nCols = 12, styleStr = '', headingFunc = this.genPanelHeading, bodyFunc = this.genPanelBody) {
        return $_$('div', {
                class: 'col-lg-' + nCols
            },
            $_$('div', {
                    class: 'panel panel-default cenarius-group ' + extraHtmlClass,
                    style: styleStr
                },
                headingFunc(heading) +
                bodyFunc(body)
            )
        );
    };
}

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
    const $elt = $('#' + id);
    if (val && !$elt.prop('checked'))
        $elt.trigger('click');
}

function singleChoiceToggle(ckbx) {
    if (ckbx.prop('checked')) {
        ckbx.parent().parent().siblings().each(function() {
            $(this).find('input[type=checkbox]').each(function() {
                if ($(this).prop('checked'))
                    $(this).trigger('click');
            });
        });
    }
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

function addSubobjectInstance(tabHeaders) {
    const tabID = tabHeaders.prop('id');
    const templateID = tabID.substr(0, tabID.length - 5) + '_template';
    let tabContent = tabHeaders.siblings('div[name=subobject_tabcontent]');
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
        fixCloneField(node, 'href');

        function fixToggleCheckboxJS(trigger) {
            const oldJS = node.attr('on' + trigger);
            if (typeof oldJS !== typeof undefined && oldJS !== false) {
                const oldCkbxID = node.prop('id').replace('_template_' + cloneIndex, '') + '_ckbx';
                const newCkbxID = node.prop('id').replace('_template_' + cloneIndex, '') +
                    '_ckbx_template_' + cloneIndex;
                const newJS = oldJS.replace(oldCkbxID, newCkbxID);
                // alert('Old JS: \n' + oldJS + '\nNew JS:\n' + newJS);
                node.attr('on' + trigger, newJS);
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

    tabHeaders.append(Htmler.genTabRef(cloneID, '#' + cloneIndex, {
        class: 'active'
    }));
    $('#' + cloneID).addClass('active in');
}

function delSubobjectInstance(tabHeaders) {
    if (confirm('Confirm delete?')) {
        let tabContent = tabHeaders.siblings('div[name=subobject_tabcontent]');
        const lastActiveLi = tabHeaders.children('li.active');
        const lastActiveTabcontent = tabContent.children('div.active');
        const lastActiveIndex = lastActiveLi.index();

        lastActiveLi.remove();
        lastActiveTabcontent.remove();

        spawnMinimumSubobjectInstances(tabHeaders, tabContent);

        // Set new active tab
        const newActiveIndex = lastActiveIndex >= tabHeaders.children().length ? (lastActiveIndex - 1) : lastActiveIndex;
        tabHeaders.children().eq(newActiveIndex).addClass('active in');
        tabContent.children().eq(newActiveIndex + 1).addClass('active in');
    }
}

function spawnMinimumSubobjectInstances(tabHeaders, tabContent = tabHeaders.siblings('div.tab-content')) {
    while (tabContent.children().length - 1 < config.minSubobjectInstance) {
        addSubobjectInstance(tabHeaders);
    }
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

$(() => { /* DOM ready */
    // Spawn one instance of each suboject using their template
    $('ul[name=subobject_tabheaders]').each(function(index) {
        spawnMinimumSubobjectInstances($(this));
    });

    // Fix button stuck in focus
    $(".btn").click(function(event) {
        $(this).blur();
    });
});