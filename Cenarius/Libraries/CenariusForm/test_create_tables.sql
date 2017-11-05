CREATE TABLE [new_test_table]
(
    [new_test_table_id] integer NOT NULL IDENTITY(1,1) PRIMARY KEY, 
    [patient_id_f0] nvarchar, 
    [patient_name_f1] nvarchar, 
    [patient_no_of_checks_today_f2] integer, 
    [report_date_f3] date, 
    [report_id_f4] nvarchar, 
    [report_no_of_checks_f5] integer, 
    [operator_id_f6] nvarchar, 
    [interpreter_id_f7] nvarchar, 
    [machine_id_f8] nvarchar, 
    [us_examination_mode_f9] nvarchar, 
    [00_asymptomatic_screening_f10] bit, 
    [10_exam_for_symptomatic_patient_f11] nvarchar, 
    [20_screening_mammographic_category_f15] nvarchar, 
    [fibroadenoma_f31] bit, 
    [fibrocystic_change_f32] bit, 
    [cyst_f33] bit, 
    [other_f34] nvarchar, 
    [40_surgically_altered_breast_f35] nvarchar, 
    [50_other_reasons_for_breast_sono_examination_f38] bit, 
    [us_category_f39] nvarchar, 
    [combined_mammogram_and_us_final_category_f40] nvarchar, 
    [biopsy_and_other_evaluation_suggestion_f41] nvarchar, 
    [pathology_results_f49] nvarchar, 
    [overall_summary_f89] nvarchar
);
CREATE TABLE [new_test_table.benign_lesions]
(
    [new_test_table.benign_lesions_id] integer NOT NULL IDENTITY(1,1) PRIMARY KEY, 
    [new_test_table_ref] integer NOT NULL FOREIGN KEY REFERENCES [new_test_table]([new_test_table_id]), 
    [side_f20] nvarchar, 
    [quarter_f21] nvarchar, 
    [angle_f22] float, 
    [distance_f23] float, 
    [mass_f24] bit, 
    [calcification_f25] bit, 
    [asymmetry_f26] bit, 
    [architecture_distortion_f27] bit, 
    [others_f28] nvarchar, 
    [density_of_breast_f29] nvarchar, 
    [recommendation_f30] nvarchar
);
CREATE TABLE [new_test_table.benign_lesions.test_so_lv2]
(
    [new_test_table.benign_lesions.test_so_lv2_id] integer NOT NULL IDENTITY(1,1) PRIMARY KEY, 
    [new_test_table.benign_lesions_ref] integer NOT NULL FOREIGN KEY REFERENCES [new_test_table.benign_lesions]([new_test_table.benign_lesions_id]), 
    [fill_me_f18] nvarchar, 
    [fill_me2_f19] float
);
CREATE TABLE [new_test_table.tumour_details]
(
    [new_test_table.tumour_details_id] integer NOT NULL IDENTITY(1,1) PRIMARY KEY, 
    [new_test_table_ref] integer NOT NULL FOREIGN KEY REFERENCES [new_test_table]([new_test_table_id]), 
    [side_f51] nvarchar, 
    [position_f52] integer, 
    [distance_f53] float, 
    [max_diameter_f54] float, 
    [shape_f55] nvarchar, 
    [orientation_f56] nvarchar, 
    [margin_f57] nvarchar, 
    [echo_pattern_f58] nvarchar, 
    [posterior_features_f59] nvarchar, 
    [associated_features_f60] nvarchar, 
    [vascularity_f66] nvarchar, 
    [surrounding_change_f67] nvarchar, 
    [special_case_f74] nvarchar, 
    [calcifications_f86] nvarchar, 
    [elasticity_assessment_f87] nvarchar, 
    [tumour_summary_f88] nvarchar
);