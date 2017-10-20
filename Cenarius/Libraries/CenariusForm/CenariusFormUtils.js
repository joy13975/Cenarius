/* 
Author: Joy Yeh
Inspired by Joshfire's JsonForms
*/
'use strict';

var config = {
    default_type: "string",
    infer_object: true,
    default_title: "key_titleize",
    title_options: [
        "key_titleize",
        "key_lower_case",
        "key_upper_case",
        "key"
    ],

    default_auto_checkbox: "none",
    auto_checkbox_options: [
        "none",
        "single",
        "multi"
    ],
    default_auto_checkbox_field_type: "boolean",

    enum_single_ui: "dropdown",
    enum_multi_ui: "checkboxes",
    subobject_ui: "tabs-editable",
    either_group_ui: "tabs",

    default_field_width: 4,
    default_dropdown_width: 8
}

function getNameFromKey(key) {
    switch (config.default_title) {

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

function isSet(value) {
    return !(_.isUndefined(value) || _.isNull(value));
};

function titleize(str) {
    return str.replace(/\w\S*/g, function(txt) {
        return txt[0].toUpperCase() + txt.substring(1).toLowerCase();
    });
}