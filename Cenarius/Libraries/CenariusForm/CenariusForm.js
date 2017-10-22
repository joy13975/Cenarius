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

        genObj(node, name, sandwitch) {
            console.log('genObj()');

            // Html class
            let extraHtmlClass = node.hasOwnProperty('_htmlClass') ?
                node._htmlClass : config.defaultObjectHtmlClass;

            this.formaHtml += genNameTag(name);
            this.formaHtml += '<div class="cenarius-group ' + extraHtmlClass + '">';

            sandwitch();

            this.formaHtml += '</div>';
        };

        genSubobj(node, name, sandwitch) {
            console.log('genSubobj()');

            // Html class
            let extraHtmlClass = node.hasOwnProperty('_htmlClass') ?
                node._htmlClass : config.defaultObjectHtmlClass;

            this.formaHtml += genNameTag(name, 'warning');
            this.formaHtml += '<div class="cenarius-group ' + extraHtmlClass + '">';

            sandwitch();

            this.formaHtml += '</div>';
        };

        genEnum(node, key, name, sandwitch) {
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
                    '<div class="input-group">';

                this.formaHtml +=
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
                    '</select>';
                this.formaHtml +=
                    '</div>' +
                    '</div>';
            } else {
                let extraHtmlClass = node.hasOwnProperty('_htmlClass') ?
                    node._htmlClass : config.defaultComplexEnumHtmlClass;

                let mcStr = multiChoice ? ' (multiple choice)' : ' (single choice)';
                this.formaHtml += genNameTag(name + mcStr, 'default');

                this.formaHtml +=
                    '<div class="cenarius-group ' + extraHtmlClass + '">';

                sandwitch();
                this.formaHtml +=
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
            let tagStyle = 'style="' +
                (inputType == 'checkbox' ?
                    ('border-right: 4px; ' +
                        'border-top-right-radius: 4; ' +
                        'border-bottom-right-radius: 4; ') : '') +
                ' "';


            let fieldStyle = 'style="' +
                textAlignment +
                '" ';

            // Prevent duplicate IDs
            let fieldID = this.getNextID(key);

            this.formaHtml +=
                '<div class="cenarius-input-wrapper ' + extraHtmlClass + '">' +
                '<div class="input-group">';

            switch (inputType) {
                case 'checkbox':
                    {
                        this.formaHtml +=
                        '<input type="checkbox" name="' + fieldID + '" id="' + fieldID + '" autocomplete="off">' +
                        '<label for="' + fieldID + '" class="btn btn-default cenarius-ckbx-btn">' +
                        '<span class="glyphicon glyphicon-ok"></span>' +
                        '<span>&nbsp;</span>' +
                        '</label>' +
                        '<label for="' + fieldID + '" class="btn btn-default active cenarius-ckbx-lbl">' +
                        name +
                        '</label>';
                        break;
                    }
                case 'text':
                case 'number':
                case 'date':
                    {
                        this.formaHtml +=
                        '<span class="input-group-addon cenarius-input-tag" ' + tagStyle + '>' +
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

            const type = (next.hasOwnProperty('_type') ? next._type :
                (next.hasOwnProperty('_enum') || next.hasOwnProperty('_enum_multi') ? 'enum' :
                    (hasProps && config.inferObjectFromProps ? 'object' :
                        myCore.currentDefaultType)));

            console.log('key: ' + key + ', name: ' + name + ', content: ' + next + ', type: ' + type);

            const defaultType = next.hasOwnProperty('_default_type') ?
                next._default_type : 'string';

            function sandwitch() {
                _.each(Object.keys(children),
                    function(nextKey) {
                        myCore.setDefaultType(defaultType);

                        visitNode(children, nextKey);

                        myCore.resetDefaultType();
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
                        myCore.genSubobj(next, name, sandwitch);
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

    function genNameTag(name, flavour = 'info', size = 20) {
        return '<div class="col-sm-12 cenarius-group-tag">' +
            '<span style="font-size:' + size + 'px">' +
            '<span class="label label-' + flavour + '">' +
            name +
            '</span>' +
            '</span>' +
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