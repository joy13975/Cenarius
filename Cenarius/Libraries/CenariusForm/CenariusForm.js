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

    defaultAutoCheckbox: "none",
    autoCheckboxOptions: [
        "none",
        "single",
        "multi"
    ],
    defaultAutoCheckboxField_type: "boolean",
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

(function(global, $) {

    const _space = '&nbsp;';
    const fieldColon = config.autoLabelColon ? ':' : '';
    const fieldSpace = config.autoLabelSpace ? _space : '';

    class Core {
        constructor() {
            this.formaHtml = '';
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

            this.formaHtml += '<div class="col-sm-' + nCols + '">' +
                genNameTag(name, 'default') + '<div class="cenarius-group cenarius-default-border col-sm-12' +
                extraHtmlClass + '">';

            sandwitch();

            this.formaHtml +=
                '</div>' +
                '</div>';
        };

        genSubobj(node, key, name, sandwitch) {
            console.log('genSubobj()');

            // Html class
            const extraHtmlClass = node.hasOwnProperty('_html_class') ?
                node._html_class : '';
            const nCols = node.hasOwnProperty('_cols') ?
                node._cols : config.nCols.subobject;

            this.formaHtml += '<div class="col-sm-' + nCols + '">' +
                genNameTag(name, 'danger') +
                '<div class="cenarius-group cenarius-danger-border col-sm-12' +
                extraHtmlClass + '">';

            // Nav tab header
            const fieldID = this.getNextID(key + '_so1');
            this.formaHtml += '<ul class="nav nav-tabs" name="subobject_tabs" id="' + fieldID + '_tabs">' +
                '</ul>';

            // Tab templates
            this.formaHtml += '<div class="tab-content">';
            this.formaHtml += '<div id="' + fieldID + '_template" class="tab-pane">';

            // Button for remove current tab
            this.formaHtml +=
                '<div class="col-sm-12">' +
                '<button type="button" class="btn btn-default btn-sm cenarius-del-tab-btn" ' +
                'name="del_tab_btn" onclick="delSubobjectInstance($(this).parent().parent().parent())">' +
                '<span class="glyphicon glyphicon-remove"></span>' +
                '</button>' +
                '<button type="button" class="btn btn-default btn-sm cenarius-new-tab-btn" ' +
                'name="new_tab_btn" onclick="addSubobjectInstance($(this).parent().parent().parent().siblings(\'ul[name=subobject_tabs]\'))">' +
                '<span class="glyphicon glyphicon-plus"></span>' +
                '</button>' +
                '</div>';

            sandwitch();

            this.formaHtml +=
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
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
                _.each(enumData, function(item) {
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

            if (simpleEnum) {
                this.formaHtml +=
                    '<div class="cenarius-input-wrapper col-sm-' + nCols + ' ' + extraHtmlClass + '">' +
                    '<div class="input-group">';

                if (isForceCheckbox) {
                    // This should only happen in complex lists
                    this.formaHtml +=
                        '<input type="checkbox" name="' + fieldID + '_ckbx" id="' + fieldID + '_ckbx" autocomplete="off">' +
                        '<label for="' + fieldID + '_ckbx" class="btn btn-default cenarius-ckbx-btn">' +
                        '<span class="glyphicon glyphicon-ok cenarius-chbkx-icon "></span>' +
                        '<span>&nbsp;</span>' +
                        '</label>';

                    this.formaHtml += '<span style="width:100%; display: table-cell">';
                    this.formaHtml += '<span style="width:100%; display: table">';
                }

                this.formaHtml +=
                    '<span class="input-group-addon cenarius-input-tag">' +
                    '<b>' +
                    name + fieldColon + fieldSpace +
                    '</b>' +
                    '</span>' +
                    '<select class="selectpicker form-control" id="' + fieldID + '"' +
                    'data-live-search="true" ' +
                    'onchange="setCheckbox(\'' + fieldID + '\' + \'_ckbx\', $(this).prop(\'selectedIndex\') != 0);" ' +
                    '>';

                this.formaHtml += '<option selected value> -- </option>';
                _.each(enumData,
                    function(item) {
                        coreSelf.formaHtml +=
                            '<option>' +
                            item +
                            '</option>';
                    }
                );

                if (isForceCheckbox) {
                    this.formaHtml +=
                        '</span>' +
                        '</span>';
                }


                this.formaHtml +=
                    '</select>';
                this.formaHtml +=
                    '</div>' +
                    '</div>';
            } else {
                const mcStr = isMultiChoice ? ' (multiple choice)' : ' (single choice)';

                this.formaHtml += '<div class="col-sm-' + nCols + '">';
                this.formaHtml += genNameTag(name + mcStr, 'warning');
                this.formaHtml += '<div class="cenarius-group cenarius-warning-border col-sm-12' +
                    extraHtmlClass + '">';

                this.setForceCheckbox();

                // Group these checkboxes
                if (isMultiChoice)
                    this.formaHtml += '<div name="multi_choice_group">';

                sandwitch();

                if (isMultiChoice)
                    this.formaHtml += '</div>';

                this.unsetForceCheckbox();

                this.formaHtml +=
                    '</div>' +
                    '</div>';
            }
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
                        numStep = 'step="' +
                        (node.hasOwnProperty('_number_step') ? node._number_step :
                            config.defaultNumberStep) +
                        '" ';
                        break;
                    }
                case 'integer':
                    {
                        inputType = 'number';
                        numStep = 'step="1" ';
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

            let numMinMax = '';
            if (node.hasOwnProperty('_min'))
                numMinMax += 'min="' + node._min + '" ';
            if (node.hasOwnProperty('_max'))
                numMinMax += 'min="' + node._max + '" ';

            // Default value
            const defaultFieldValue = node.hasOwnProperty('_defaultValue') ?
                node._defaultValue : '';
            let defaultValueStr = '';
            switch (inputType) {
                case 'number':
                    {
                        defaultValueStr = 'value="' +
                        (defaultFieldValue == '' ? '0' : defaultFieldValue) +
                        '" ';
                        break;
                    }
                case 'date':
                    {
                        defaultValueStr = 'value="' +
                        (defaultFieldValue == '' ?
                            (new Date()).toISOString().slice(0, 10) : defaultFieldValue) +
                        '" ';
                        break;
                    }
                default:
                    {
                        defaultValueStr = 'value="" ';
                        break;
                    }
            }

            // Html class
            let extraHtmlClass = node.hasOwnProperty('_html_class') ?
                node._html_class : '';
            let nCols = node.hasOwnProperty('_cols') ? node._cols :
                this.currentDefaultNCols != '' ? this.currentDefaultNCols :
                config.nCols.input;

            const defaultTextareaRows = node.hasOwnProperty('_textarea_rows') ?
                node._textarea_rows : '5';

            // Optional html strings
            const isTextArea = inputTag == 'textarea';

            const textAlignment = isTextArea ?
                '' : 'text-align: right; ';
            const textAreaRows = isTextArea ?
                'rows="' + defaultTextareaRows + '"' : '';
            const inputTagClosing = isTextArea ?
                ('</' + inputTag + '>') : '';
            const endingSpan = node.hasOwnProperty('_ending') ?
                '<span class="input-group-addon cenarius-input-tag">' + node._ending + '</span>' : '';

            // Styles
            const fieldStyle = textAlignment;

            // Prevent duplicate IDs
            const fieldID = this.getNextID(key);

            this.formaHtml +=
                '<div class="cenarius-input-wrapper col-sm-' + nCols + ' ' + extraHtmlClass + '">' +
                '<div class="input-group" style="width: 100% !important">';

            const fieldName = name + fieldColon + fieldSpace;
            const isForceCheckbox = this.forceCheckbox ||
                (node.hasOwnProperty('_force_checkbox') && node._force_checkbox);

            switch (inputType) {
                case 'checkbox':
                    {
                        this.formaHtml +=
                        '<input type="checkbox" name="' + fieldID + '" id="' + fieldID + '" autocomplete="off">' +
                        '<label for="' + fieldID + '" class="btn btn-default cenarius-ckbx-btn">' +
                        '<span class="glyphicon glyphicon-ok cenarius-chbkx-icon "></span>' +
                        '<span>&nbsp;</span>' +
                        '</label>' +
                        '<label for="' + fieldID + '" class="btn btn-default cenarius-ckbx-lbl" >' +
                        name +
                        '</label>';
                        break;
                    }
                case 'text':
                case 'number':
                case 'date':
                    {
                        if (isForceCheckbox) {
                            // This should only happen in complex lists
                            this.formaHtml +=
                                '<input type="checkbox" name="' + fieldID + '_ckbx" id="' + fieldID + '_ckbx" autocomplete="off">' +
                                '<label for="' + fieldID + '_ckbx" class="btn btn-default cenarius-ckbx-btn">' +
                                '<span class="glyphicon glyphicon-ok cenarius-chbkx-icon "></span>' +
                                '<span>&nbsp;</span>' +
                                '</label>';

                            this.formaHtml += '<span style="width:100%; display: table-cell">';
                            this.formaHtml += '<div style="width:100%; min-height: 34px; display: table">';
                        }

                        this.formaHtml +=
                        '<span class="input-group-addon cenarius-input-tag">' +
                        '<b>' + fieldName + '</b>' +
                        "</span>" +
                        '<' + inputTag + ' class="form-control" ' +
                        'style="' + fieldStyle + '" ' +
                        'id="' + fieldID + '" ' +
                        'type="' + inputType + '" ' +
                        'onkeyup="setCheckbox(\'' + fieldID + '\' + \'_ckbx\', $(this).val().length > 0);" ' +
                        'onchange="setCheckbox(\'' + fieldID + '\' + \'_ckbx\', $(this).val() .length > 0);" ';

                        this.formaHtml +=
                        numStep +
                        numMinMax +
                        defaultValueStr +
                        textAreaRows +
                        '>' +
                        inputTagClosing +
                        endingSpan;

                        if (isForceCheckbox) {
                            this.formaHtml +=
                                '</div>' +
                                '</span>';
                        }

                        break;
                    }
                default:
                    {
                        this.formaHtml += '<p>Unknown field type: ' + inputType + '</p>';
                        break;
                    }
            }

            // Close wrapper
            this.formaHtml +=
                '</div>' +
                '</div>';
        };
    };

    $.fn.cenariusForm = function(options) {
        let forma = options.forma;
        let myCore = new Core();

        function visitNode(node, key) {
            const next = node[key];
            let name;
            if (next.hasOwnProperty('_title')) name = next._title;
            else if (typeof next == "string") name = next;
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
                (type == 'enum' ? 'boolean' : 'string');

            const defaultNCols = next.hasOwnProperty('_default_cols') ? next._default_cols : '';

            function sandwitch() {
                _.each(Object.keys(children),
                    function(nextKey) {
                        myCore.setDefaultType(defaultType);
                        myCore.setDefaultNCols(defaultNCols);

                        visitNode(children, nextKey);

                        myCore.resetDefaultType();
                        myCore.resetDefaultNCols();
                    }
                );
            };

            switch (type) {
                case 'object':
                    {
                        myCore.genObj(next, name, sandwitch);
                        break;
                    }
                case 'subobject':
                    {
                        myCore.genSubobj(next, key, name, sandwitch);
                        break;
                    }
                case 'enum':
                    {
                        myCore.genEnum(next, key, name, sandwitch);
                        break;
                    }
                default:
                    {
                        myCore.genLeaf(next, type, key, name);
                        break;
                    }
            }
        }

        _.each(Object.keys(forma), function(groupKey) {
            visitNode(forma, groupKey, true);
        });


        if (!this.hasClass('row'))
            this.addClass('row');

        this.append(myCore.formaHtml);
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
        return '<div class="col-sm-' + nCols + ' cenarius-group-tag">' +
            '<span style="font-size:' + size + 'px">' +
            '<span class="label label-' + flavour + '">' +
            name +
            '</span>' +
            '</span>' +
            '</div>';
    }

    function titleize(str) {
        return str.replace(/\w\S*/g, function(txt) {
            return txt[0].toUpperCase() + txt.substring(1).toLowerCase();
        });
    }

    String.prototype.replaceAll = function(search, replacement) {
        return this.replace(new RegExp(search, 'g'), replacement);
    };
})(window,
    ((typeof jQuery !== 'undefined') ? jQuery : {
        fn: {}
    }));

function setCheckbox(ckbxID, val) {
    alert('id: ' + ckbxID);
    $('#' + ckbxID).prop('checked', val);
}

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
    descendAll(clone, function(node) {
        const nodeID = node.prop('id');
        if (isSet(nodeID))
            node.prop('id', nodeID + '_' + cloneID);
        const nodeName = node.prop('name');
        if (isSet(nodeName))
            node.prop('name', nodeName + '_' + cloneID);
        const nodeFor = node.prop('for');
        if (isSet(nodeFor))
            node.prop('for', nodeFor + '_' + cloneID);
    });

    clone.prop('id', cloneID);
    tabContent.append(clone);

    // De-select the rest
    tabHeaders.children().removeClass('active in');
    tabContent.children().removeClass('active in');

    // Spawn new reference
    tabHeaders.append(
        '<li class="active">' +
        '<a data-toggle="tab" href="#' + cloneID + '"  style="background: #ecc">' +
        '<b>#' +
        cloneIndex +
        '</b>' +
        '</a>' +
        '</li>');

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

$(function() { /* DOM ready */
    // Spawn one instance of each suboject using their template
    (function spawnDefaultSuboject() {
        $('ul[name=subobject_tabs]').each(function(index) {
            spawnMinimumSubobjectInstances($(this));
        });
    })();


    // Fix button stuck in focus
    $(".btn").click(function(event) {
        $(this).blur();
    });
});