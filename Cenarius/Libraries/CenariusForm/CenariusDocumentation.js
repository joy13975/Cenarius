'use strict';
const leftAngBracket = '&lt;';
const rightAngBracket = '&gt;';
const angBrackets = (str) => {
	return leftAngBracket + str + rightAngBracket;
}

function escapeHtml(unsafe) {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

const docFormi = {
	table_name: 'documentation',
	heading: '<font color="white">Cenarius Documentation</font>',
	no_ctrl_panel: true,
	background_color: '#67b0db'
};

const testFormi = {
	table_name: 'registration_demo',
	title: 'Cenarius Demo 1',
	heading: 'Cenarius Registration Demo'
}

const str_field_example1 = {
	default_value: 'Text Here'
}

const str_field_example2 = {
	title: 'String Field Title',
	suffix: 'Some Suffix',
	default_value: 'Default Text'
}

const big_str_field_example = {
	title: 'Big String Field Title',
	type: 'big_string',
	default_value: 'Default Text'
}

const integer_field_example1 = {
	suffix: 'some_suffix',
	type: 'integer',
	min: 0,
	default_value: 18
}

const integer_field_example2 = {
	title: 'Integer Field Title',
	suffix: 'Unit Suffix',
	type: 'integer',
	min: 0,
	max: 5,
	default_value: 3
}

const float_field_example = {
	title: 'Float Field Title',
	suffix: 'Unit Suffix',
	type: 'float',
	min: 0.5,
	max: 11.5,
	step: 0.001,
	default_value: 3.14
}

const boolean_field_example = {
	title: 'Bool Field Title',
	type: 'boolean',
	default_value: true
}

const simple_enum_field_example = {
	title: 'Simple Enum Title',
	default_value: 3,
	suffix: 'Enum Can Not Yet Have Suffices!',
	enum: [
		'0.Category 0',
		'1.Category 1',
		'2.Category 2',
		'3.Category 3'
	]
}

const complex_enum_field_example = {
	title: 'Complex Enum Title',
	enum: [
		'0.Category 0',
		'1.Category 1',
		'2.Category 2', {
			title: '3.Other category (string)',
			require_input: 'string',
			default_value: 'Some New Category'
		}, {
			title: '4.Other category (float)',
			require_input: 'float'
		}
	]
}

const date_field_example1 = {
	type: 'date'
}

const date_field_example2 = {
	title: 'Date Field Title',
	suffix: 'Date Field Suffix',
	type: 'date',
	default_value: '2000-05-29'
}

const label_field_example = {
	style: 'color: red; font-size:32px',
	content: 'Big Red Font label content here.'
}

const code_field_example = {
	type: 'code',
	language: 'cs',
	content: `public ActionResult Index()
	{
		// Some awesome comment
		return View();
	}`
}

const space_field_example = {
	type: 'space',
	height: '100px'
}

const custom_field_example = {
	type: 'custom',
	tag: 'div',
	html_class: 'well',
	style: 'text-align: center',
	content: 'This is a custom well'
}

const objExample = {
	default_cols: 6,
	properties: {
		str_field_example1: str_field_example1,
		integer_field_example1: integer_field_example1,
		another_object: {
			default_cols: 6,
			properties: {
				'Some More Text': {},
				'Some Enum': {
					'enum': ['some choice 1', 2, 'choice 3']
				}
			}
		},
		yet_another_object: {
			type: 'object',
			properties: {}
		}
	}
}

const subobjExample = {
	type: 'subobject',
	properties: {
		str_field_example1: str_field_example1,
		another_subobj: {
			cols: 6,
			type: 'subobject',
			properties: {
				date_field_example1: date_field_example1
			}
		},
		yet_another_subobj: {
			cols: 6,
			type: 'subobject',
			min_instances: 3,
			properties: {
				integer_field_example1: integer_field_example1
			}
		}
	}
}

const documentationFormo = {
	formi: docFormi,
	forma: {
		introduction: {
			properties: {
				intro_text: {
					content: 'Github link: <a href="https://github.com/joy13975/cenarius" target="_blank">github.com/joy13975/cenarius</a>\n\n' +
						'<i>Cenarius</i> is a tool that reads a JSON <i>formo</i> and:\n' +
						'  1. Generates a HTML webpage allowing input to the specified data structure,\n' +
						'  2. Automatically scaffolds the backend database structure (for now, MSSQL),\n' +
						'  3. Manages the UI-Server-DB communication, and\n' +
						'  4. Serves the form to users automatically through URL query\n' +
						'\n' +
						'*Cenarius can also generate static webpages, such as this documentation.\n' +
						'*Cenarius uses bootstrap, so knowing the grid system (columns, especially) helps laying out your next form.\n' +
						'*Cenarius is mostly client-side code for now.\n' +
						'*<i>Formo</i> stands for <i>form options</i>; each formo contains a <i>formi</i> (<u>FORM</u> <u>I</u>nfo) and a <i>forma</i> (<u>FORM</u> schem<u>A</u>).'
				}
			}
		},
		setup: {
			title: "I - Setup",
			properties: {
				setup_text: {
					content: '1. Download the VS17 solution from <a href="https://github.com/joy13975/Cenarius/archive/master.zip"">here</a>.\n' +
						'2. Setup an MSSQL server and copy its connection string\n' +
						'3. <i>Literally</i>, replace the username in the string with "{your_username}" and password with "{your_password}". These will be search tokens for configuration.\n' +
						'\n' +
						'Example: \n' +
						'<mark-str>' +
						'"Server=tcp:cenarius.database.windows.net,1433;Initial Catalog=CenariusAppDB;\n' +
						'Persist Security Info=False;User ID={your_username};Password={your_password};\n' +
						'MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;\n' +
						'Connection Timeout=30;"' +
						'</mark-str>\n' +
						'\n' +
						'4. Replace this string as <mark-var>sqlStr</mark-var> in <mark-path>Cenarius/Libraries/Utility.cs</mark-path>\n' +
						'5. Copy <mark-path>Cenarius/SqlCredentials.json.example</mark-path> to <mark-path>Cenarius/SqlCredentials.json</mark-path> ' +
						'and replace the username & password with your actual username & password\n' +
						'6. You can now debug or deploy this solution'
				}
			}
		},
		routing: {
			title: 'II - Routing',
			properties: {
				actions_text: {
					content: '<b>Frontend</b>:\n' +
						'  <i>~/Home/Documentation</i>\n' +
						'    Displays this documentation.\n' +
						'  <i>~/Home/Index</i>\n' +
						'    Allows uploading of new Formo JSON files.\n' +
						'  <i>~/Home/New?name=' + angBrackets('formo_name') + '</i>\n' +
						'    Displays the form webpage specified by the formo named ' + angBrackets('formo_name') + '.\n' +
						'  <i>~/Home/Search?name=' + angBrackets('formo_name') + '</i>\n' +
						'    [Unimplemented] Allows searching and editing of records for a the formo named ' + angBrackets('formo_name') + '.\n' +
						'\n' +
						'<b>API</b>:\n' +
						'  <i>~/Home/UploadFormo</i>\n' +
						'    Accepts a JSON formo as post data from user; verifies that it\'s indeed JSON, and save it on the server.\n' +
						'  <i>~/Home/MakeTables</i>\n' +
						'    Accepts decorated formo as post data from user; creates database structure based on data strcuture specified by a formo.\n' +
						'  <i>~/Home/Submit</i>\n' +
						'    Accepts data object as post data from user; attempts to insert to tables corresponding to the current formo',
					style: 'text-align: left'
				}
			}
		},
		formo_doc: {
			title: 'III - Formo Structure and Components',
			help_text: 'The formo is a JSON object that consists of a formi and a forma.',
			properties: {
				formi: {
					title: 'III.A - Formi',
					properties: {
						formi_text1: {
							content: 'The formi contains information about the form that are not part of the data structure.\n' +
								'Examples:'
						},
						example_code1: {
							cols: 6,
							type: 'code',
							language: 'js',
							style: 'height: 200px',
							content: escapeHtml(JSON.stringify(docFormi, null, 4))
						},
						example_code2: {
							cols: 6,
							type: 'code',
							language: 'js',
							style: 'height: 200px',
							content: escapeHtml(JSON.stringify(testFormi, null, 4))
						}
					}
				},
				forma: {
					title: 'III.B - Forma',
					properties: {
						formi_text: {
							content: 'The forma describes the object hierarchy and input types of each field.'
						},
						forma_node_attributes: {
							content: 'Forma Node Attributes:</b>\n' +
								'  <mark-var>title</mark-var>: ' +
								'Sets the panel heading title for this node. If not set, it defaults to titleized.\n' +
								'  <mark-var>type</mark-var>: ' +
								'Sets the node type. This field can be omitted if the node fits one of the following:\n' +
								'    -It has <mark-var>properties</mark-var>, meaning it <i>should</i> be an object\n' +
								'    -It has <mark-var>enum</mark-var>, meaning it <i>should</i> be an enum\n' +
								'    -It has <mark-var>content</mark-var>, meaning it <i>should</i> be an label\n'
						},
						grouping_types: {
							title: 'III.B.i - Grouping Types',
							properties: {
								object: {
									properties: {
										obj_text1: {
											content: 'An object is a generic grouping construct. ' +
												'All it does, is grouping zero or more other constructs (may even be another object) in one panel. ' +
												'It also acts as a multi-choice enum (i.e. an object with multiple boolean fields).\n' +
												'Example:'
										},
										obj_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 500px',
											content: '"some_object": ' +
												escapeHtml(JSON.stringify(objExample, null, 4))
										},
										obj_result_text1: {
											content: 'Result: '
										},
										some_object: objExample
									}
								},
								subobject: {
									properties: {
										so_text1: {
											content: 'A subobject is essentially a sub-form. It differentiates from object in that there can be multiple ' +
												'instances of a subobject. This complex hierarchy of data is automatically handled by Cenarius, including the backend DB scaffolding. ' +
												'It is also possible to have multiple levels of subobjects. The type must be declared for subobjects.\n' +
												'Example:'
										},
										so_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 380px',
											content: '"some_object": ' +
												escapeHtml(JSON.stringify(subobjExample, null, 4))
										},
										so_result_text1: {
											content: 'Result: '
										},
										some_object: subobjExample
									}
								}
							}
						},
						input_types: {
							title: 'III.B.ii - Input Types',
							properties: {
								string_field: {
									properties: {
										str_field_text1: {
											content: 'A string field accepts (short) text as input.'
										},
										str_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"str_field_example2": ' +
												escapeHtml(JSON.stringify(str_field_example2, null, 4))
										},
										str_result_text1: {
											content: 'Result: '
										},
										str_field: str_field_example2
									}
								},
								big_string_field: {
									properties: {
										big_str_field_text1: {
											content: 'A multi-row \"big\" string field accepts large text as input. The suffix defaults to character-count, ' +
												'but can be overridden with the <mark-var>suffix</mark-var> attribute.'
										},
										big_str_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"big_str_field_example": ' +
												escapeHtml(JSON.stringify(big_str_field_example, null, 4))
										},
										big_str_result_text1: {
											content: 'Result: '
										},
										big_str_field: big_str_field_example
									}
								},
								integer_field: {
									properties: {
										integer_field_text1: {
											content: 'An integer field accepts an integer (round numbers) as input.'
										},
										integer_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"integer_field_example2": ' +
												escapeHtml(JSON.stringify(integer_field_example2, null, 4))
										},
										integer_result_text1: {
											content: 'Result: '
										},
										integer_field: integer_field_example2
									}
								},
								float_field: {
									properties: {
										float_field_text1: {
											content: 'A floating-point number field accepts an float (fractional numbers) as input. Default step is 0.01.'
										},
										float_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"float_field_example": ' +
												escapeHtml(JSON.stringify(float_field_example, null, 4))
										},
										float_result_text1: {
											content: 'Result: '
										},
										ffloat_field: float_field_example
									}
								},
								boolean_field: {
									properties: {
										boolean_field_text1: {
											content: 'A boolean field accepts a true or false value as input.'
										},
										boolean_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"boolean_field_example": ' +
												escapeHtml(JSON.stringify(boolean_field_example, null, 4))
										},
										boolean_result_text1: {
											content: 'Result: '
										},
										boolean_field: boolean_field_example
									}
								},
								enum_field: {
									properties: {
										enum_field_text1: {
											content: 'A simple enum field accepts a categorical value as input.'
										},
										enum_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"simple_enum_field_example": ' +
												escapeHtml(JSON.stringify(simple_enum_field_example, null, 4))
										},
										enum_result_text1: {
											content: 'Result: '
										},
										enum_field: simple_enum_field_example
									}
								},
								complex_enum_field: {
									properties: {
										complex_enum_field_text1: {
											content: 'A complex enum field accepts a categorical value as input, where some of the categories might be variable ' +
												'e.g. a text field for defining new categories. ' +
												'In a complex enum, only one choice can be active (selected) at a time. The UI automatically toggles other choices when ' +
												'any one field is activated. For multi-choice complex enum, simply use an object.'
										},
										complex_enum_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"complex_enum_field_example": ' +
												escapeHtml(JSON.stringify(complex_enum_field_example, null, 4))
										},
										complex_enum_result_text1: {
											content: 'Result: '
										},
										complex_enum_field: complex_enum_field_example
									}
								},
								date_field: {
									properties: {
										date_field_text1: {
											content: 'A date field accepts a date value as input. The display format is <i>browser-dependent</i>. ' +
												'However, the <mark-var>default_value</mark-var> attribute is always parsed as yyyy-MM-dd.'
										},
										date_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"date_field_example2": ' +
												escapeHtml(JSON.stringify(date_field_example2, null, 4))
										},
										date_result_text1: {
											content: 'Result: '
										},
										date_field: date_field_example2
									}
								}
							}
						},
						non_input_types: {
							title: 'III.B.ii - Non-Input Types',
							properties: {
								label_field: {
									properties: {
										label_text1: {
											content: 'A label displays a string. Without specifying a type, Cenarius considers the ' +
												'<mark-var>content</mark-var> attribute to be a signal for a label node.'
										},
										label_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"label_field_example": ' +
												escapeHtml(JSON.stringify(label_field_example, null, 4))
										},
										label_result_text1: {
											content: 'Result: '
										},
										label_field: label_field_example
									}
								},
								code_field: {
									properties: {
										code_text1: {
											content: 'A code displays a prettyfied code snippet.'
										},
										code_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"code_field_example": ' +
												escapeHtml(JSON.stringify(code_field_example, null, 4))
										},
										code_result_text1: {
											content: 'Result: '
										},
										code_field: code_field_example
									}
								},
								space_field: {
									properties: {
										space_text1: {
											content: 'A space adds an empty space (remember that this is still a column).'
										},
										space_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"space_field_example": ' +
												escapeHtml(JSON.stringify(space_field_example, null, 4))
										},
										space_result_text1: {
											content: 'Result: '
										},
										space_field: space_field_example
									}
								},
								custom_field: {
									properties: {
										custom_text1: {
											content: 'A custom element is a flexible node that allows HTML elements that are not one of the Cenarius types. ' +
												'Note that because of how flexible a custom element can be, input fields specified by a custom element may not be mapped correctly to a backend data variable.'
										},
										custom_code1: {
											type: 'code',
											language: 'js',
											style: 'height: 170px',
											content: '"custom_field_example": ' +
												escapeHtml(JSON.stringify(custom_field_example, null, 4))
										},
										custom_result_text1: {
											content: 'Result: '
										},
										ccustom_field: custom_field_example
									}
								}
							}
						}
					}
				}
			}
		}
	}
};