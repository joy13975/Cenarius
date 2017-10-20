/* 
A library that reads Cenarius-flavoured JSON and produces:
    1. The web form as described
    2. The SQL table schema 
    
Author: Joy Yeh
Inspired by Joshfire's JsonForms
*/
'use strict';

(function(global, $) {

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

        defaultObjectHtmlClass: 'col-sm-12',
        defaultSubobjectHtmlClass: 'col-sm-12',
        defaultEnumHtmlClass: 'col-sm-6',
        defaultComplexEnumHtmlClass: 'col-sm-12',
        defaultInputHtmlClass: 'col-sm-6'
    }

    const _space = '&nbsp;';
    const fieldColon = config.autoLabelColon ? ':' : '';
    const fieldSpace = config.autoLabelSpace ? _space : '';

    class Core {
        constructor() {
            this.formaHtml = '';
            this.fieldID = 0;
            this.resetDefaultType();
        }

        resetDefaultType() {
            console.log('resetDefaultType()');
            this.setDefaultType(config.defaultType);
        }

        setDefaultType(type) {
            console.log('setDefaultType(' + type + ')');
            this.currentDefaultType = type;
        }

        getNextID(key) {
            return (key + '_f' + (this.fieldID++).toString());
        }

        genObj(node, type, name, sandwitch) {
            console.log('genObj()');

            if (node.hasOwnProperty('_default_type'))
                this.setDefaultType(node._default_type);

            // Html class
            let extraHtmlClass = node.hasOwnProperty('_htmlClass') ?
                node._htmlClass : config.defaultObjectHtmlClass;

            this.formaHtml += genNameTag(name);
            this.formaHtml += '<div class="cenarius-group ' + extraHtmlClass + '">';

            sandwitch();

            this.resetDefaultType();

            this.formaHtml += '</div>';
        };

        genSubobj(node, type, name, sandwitch) {
            console.log('genSubobj()');

            if (node.hasOwnProperty('_default_type'))
                this.setDefaultType(node._default_type);

            // Html class
            let extraHtmlClass = node.hasOwnProperty('_htmlClass') ?
                node._htmlClass : config.defaultObjectHtmlClass;

            this.formaHtml += genNameTag(name, 'warning');
            this.formaHtml += '<div class="cenarius-group ' + extraHtmlClass + '">';

            sandwitch();

            this.resetDefaultType();

            this.formaHtml += '</div>';
        };

        genEnum(node, type, key, name) {
            console.log('genEnum()');

            let coreSelf = this;

            let multiChoice = node.hasOwnProperty("_enum_multi");

            let enumData = [];
            let simpleEnum = true;

            if (multiChoice) {
                enumData = node._enum_multi;
                simpleEnum = false;
            } else {
                enumData = node._enum;
                _.each(enumData, function(item) {
                    simpleEnum &= typeof item != 'object';
                });
            }

            let fieldID = this.getNextID(key);

            if (simpleEnum) {
                let extraHtmlClass = node.hasOwnProperty('_htmlClass') ?
                    node._htmlClass : config.defaultEnumHtmlClass;

                this.formaHtml +=
                    '<div class="cenarius-input-wrapper ' + extraHtmlClass + '">' +
                    '<div class="input-group">' +
                    '<span class="input-group-addon">' +
                    '<label for="' + fieldID + '">' +
                    name + fieldColon + fieldSpace +
                    '</label>' +
                    '</span>' +
                    '<select class="selectpicker form-control" id="' + fieldID + '"' +
                    'data-live-search="true" ' +
                    '>'

                _.each(enumData,
                    function(item) {
                        coreSelf.formaHtml +=
                            '<option>' +
                            item +
                            '</option>';
                    }
                );

                this.formaHtml +=
                    '</select>' +
                    '</div>' +
                    '</div>';
            } else {
                let extraHtmlClass = node.hasOwnProperty('_htmlClass') ?
                    node._htmlClass : config.defaultComplexEnumHtmlClass;

                let mcStr = multiChoice ? ' (multiple choice)' : ' (single choice)';
                this.formaHtml += genNameTag(name + mcStr, 'default', 4);

                this.formaHtml +=
                    '<div class="cenarius-input-wrapper ' + extraHtmlClass + '">' +
                    '<div class="cenarius-group">';

                for (var i = 0; i < enumData.length; i++) {
                    let optNode = enumData[i];
                    if (typeof optNode == 'object') {
                        let optionName = optNode.hasOwnProperty('_title') ? optNode._title : '';

                        function sandwitch() {
                            _.each(Object.keys(optNode),
                                function(nextKey) {
                                    visitNode(optNode, nextKey);
                                }
                            )
                        };

                        this.genObj(optNode, 'object', optionName, sandwitch);
                    } else {
                        let optionName = optNode;
                        let optionFieldID = this.getNextID(key + '_option_' + i);
                        this.formaHtml +=
                            '<div class="input-group">' +
                            '<input type="checkbox" name="' + optionFieldID + '" id="' + optionFieldID + '" autocomplete="off">' +
                            '<label for="' + optionFieldID + '" class="btn btn-default cenarius-ckbx-btn">' +
                            '<span class="glyphicon glyphicon-ok"></span>' +
                            '<span>&nbsp;</span>' +
                            '</label>' +
                            '<label for="' + optionFieldID + '" class="btn btn-default active cenarius-ckbx-lbl">' +
                            '<b>' + optionName + '</b>' +
                            '</label>' +
                            '</div>';
                    }
                }

                this.formaHtml +=
                    '</div>' +
                    '</div>';
            }
        };

        genLeaf(node, type, key, name) {
            console.log('genLeaf()');

            let inputTag = 'input';
            let inputType = type == 'string' ? 'text' : type;

            // Default value
            let defaultValueStr = node.hasOwnProperty('_defaultValue') ?
                node._defaultValue : '';

            // Determine field type
            if (type == 'big_string') {
                inputType = 'text';
                inputTag = 'textarea';
            } else if (type == 'boolean') {
                inputType = 'checkbox';
            }

            // Deal with number input
            let numStep = '';
            if (type == 'number') {
                numStep = 'step="' +
                    node.hasOwnProperty('_number_step') ?
                    node._number_step : config.defaultNumberStep +
                    '" ';
            } else if (type == 'integer') {
                numStep = 'step="1" ';
                inputType = 'number';
            }

            let numMinMax = '';
            if (node.hasOwnProperty('_min'))
                numMinMax += 'min="' + node._min + '" ';
            if (node.hasOwnProperty('_max'))
                numMinMax += 'min="' + node._max + '" ';

            defaultValueStr = inputType == 'number' && defaultValueStr == '' ?
                'value="0" ' : '';

            // Deal with dates
            defaultValueStr = inputType == 'date' && defaultValueStr == '' ?
                ('value="' + (new Date()).toISOString().slice(0, 10) + '" ') : '';

            // Html class
            let extraHtmlClass = node.hasOwnProperty('_htmlClass') ?
                node._htmlClass : config.defaultInputHtmlClass;

            let defaultTextareaRows = node.hasOwnProperty('_textarea_rows') ?
                node._textarea_rows : '5';

            // Optional html strings
            let isTextArea = inputTag == 'textarea';

            let textAlignment = isTextArea ?
                '' : 'text-align: right; ';
            let textAreaRows = isTextArea ?
                'rows="' + defaultTextareaRows + '"' : '';
            let inputTagClosing = isTextArea ?
                ('</' + inputTag + '>') : '';
            let endingSpan = node.hasOwnProperty('_ending') ?
                '<span class="input-group-addon">' + node._ending + '</span>' : '';

            // Styles
            let tagStyle = inputType == 'checkbox' ?
                ('style="' +
                    'border-right: 4px; ' +
                    'border-top-right-radius: 4; ' +
                    'border-bottom-right-radius: 4; ' +
                    '" ') : '';
            let fieldStyle = 'style="' +
                textAlignment +
                '" ';

            // Prevent duplicate IDs
            let fieldID = this.getNextID(key);

            this.formaHtml +=
                '<div class="cenarius-input-wrapper ' + extraHtmlClass + '">' +
                '<div class="input-group">';
            if (inputType == 'checkbox') {
                this.formaHtml +=
                    '<input type="checkbox" name="' + fieldID + '" id="' + fieldID + '" autocomplete="off">' +
                    '<label for="' + fieldID + '" class="btn btn-default cenarius-ckbx-btn">' +
                    '<span class="glyphicon glyphicon-ok"></span>' +
                    '<span>&nbsp;</span>' +
                    '</label>' +
                    '<label for="' + fieldID + '" class="btn btn-default active cenarius-ckbx-lbl">' +
                    name +
                    '</label>';

            } else {
                this.formaHtml +=
                    '<span class="input-group-addon" ' + tagStyle + '>' +
                    '<label for="' + fieldID + '">' +
                    name + fieldColon + fieldSpace +
                    '</label>' +
                    '</span>' +
                    '<' + inputTag + ' class="form-control"' +
                    fieldStyle +
                    'id="' + fieldID + '" ' +
                    'type="' + inputType + '" ' +
                    numStep +
                    numMinMax +
                    defaultValueStr +
                    textAreaRows +
                    '>' +
                    inputTagClosing +
                    endingSpan;
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
            let next = node[key];
            let name;
            if (next.hasOwnProperty('_title')) name = next._title;
            else if (typeof next == "string") name = next;
            else name = getNameFromKey(key);
            let hasProps = next.hasOwnProperty('_properties');
            let props = hasProps ? next._properties : {};

            let type = (next.hasOwnProperty('_type') ? next._type :
                (next.hasOwnProperty('_enum') || next.hasOwnProperty('_enum_multi') ? 'enum' :
                    (hasProps && config.inferObjectFromProps ? 'object' :
                        myCore.currentDefaultType)));

            console.log('key: ' + key + ', name: ' + name + ', content: ' + next + ', type: ' + type);

            function sandwitch() {
                _.each(Object.keys(props),
                    function(nextKey) {
                        visitNode(props, nextKey);
                    }
                );
            };

            switch (type) {
                case 'object':
                    {
                        myCore.genObj(next, type, name, sandwitch);
                        break;
                    }
                case 'subobject':
                    {
                        myCore.genSubobj(next, type, name, sandwitch);
                        break;
                    }
                case 'enum':
                    {
                        myCore.genEnum(next, type, key, name);
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

    function genNameTag(name, flavour = 'info', size = 3) {
        return '<div class="col-sm-12">' +
            '<h' + size + '><span class="label label-' + flavour + '">' +
            name + '</span></h' + size + '>' +
            '</div>';
    }

    /*Utility functions*/

    function isSet(value) {
        return !(_.isUndefined(value) || _.isNull(value));
    };

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