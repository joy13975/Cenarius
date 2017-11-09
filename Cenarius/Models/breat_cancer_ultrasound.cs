//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated from a template.
//
//     Manual changes to this file may cause unexpected behavior in your application.
//     Manual changes to this file will be overwritten if the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

namespace Cenarius.Models
{
    using System;
    using System.Collections.Generic;
    
    public partial class breat_cancer_ultrasound
    {
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2214:DoNotCallOverridableMethodsInConstructors")]
        public breat_cancer_ultrasound()
        {
            this.breat_cancer_ultrasound_benign_lesions_f16 = new HashSet<breat_cancer_ultrasound_benign_lesions_f16>();
            this.breat_cancer_ultrasound_tumour_details_f43 = new HashSet<breat_cancer_ultrasound_tumour_details_f43>();
        }
    
        public int id { get; set; }
        public string patient_id_f0 { get; set; }
        public string patient_name_f1 { get; set; }
        public Nullable<int> patient_no_of_checks_today_f2 { get; set; }
        public Nullable<System.DateTime> report_date_f3 { get; set; }
        public string report_id_f4 { get; set; }
        public Nullable<int> report_no_of_checks_f5 { get; set; }
        public string operator_id_f6 { get; set; }
        public string interpreter_id_f7 { get; set; }
        public string machine_id_f8 { get; set; }
        public Nullable<bool> us_examination_mode_f9_equals_screening_us { get; set; }
        public Nullable<bool> us_examination_mode_f9_equals_diagnostic_us { get; set; }
        public Nullable<bool> us_examination_mode_f9_equals_both { get; set; }
        public Nullable<bool> C_00_asymptomatic_screening_f10 { get; set; }
        public Nullable<bool> C_11_pain_f12 { get; set; }
        public Nullable<bool> C_12_palpable_mass_f13 { get; set; }
        public Nullable<bool> C_13_discharge_f14 { get; set; }
        public Nullable<bool> C_20_screening_mammographic_category_f15_equals_0 { get; set; }
        public Nullable<bool> C_20_screening_mammographic_category_f15_equals_1 { get; set; }
        public Nullable<bool> C_20_screening_mammographic_category_f15_equals_2 { get; set; }
        public Nullable<bool> C_20_screening_mammographic_category_f15_equals_3 { get; set; }
        public Nullable<bool> C_20_screening_mammographic_category_f15_equals_4 { get; set; }
        public Nullable<bool> C_20_screening_mammographic_category_f15_equals_5 { get; set; }
        public Nullable<bool> fibroadenoma_f31 { get; set; }
        public Nullable<bool> fibrocystic_change_f32 { get; set; }
        public Nullable<bool> cyst_f33 { get; set; }
        public string other_f34 { get; set; }
        public Nullable<bool> C_41_s_p_biopsy_wide_excision_bcs_f36 { get; set; }
        public Nullable<bool> C_42_s_p_breast_augmentation_reconstruction_f37 { get; set; }
        public Nullable<bool> C_50_other_reasons_for_breast_sono_examination_f38 { get; set; }
        public Nullable<bool> us_category_f39_equals_0_category_0 { get; set; }
        public Nullable<bool> us_category_f39_equals_1_category_1 { get; set; }
        public Nullable<bool> us_category_f39_equals_2_category_2 { get; set; }
        public Nullable<bool> us_category_f39_equals_3_category_3 { get; set; }
        public Nullable<bool> us_category_f39_equals_4a_category_4a { get; set; }
        public Nullable<bool> us_category_f39_equals_4b_category_4b { get; set; }
        public Nullable<bool> us_category_f39_equals_4c_category_4c { get; set; }
        public Nullable<bool> us_category_f39_equals_5_category_5 { get; set; }
        public Nullable<bool> us_category_f39_equals_6_category_6 { get; set; }
        public Nullable<bool> combined_mammogram_and_us_final_category_f40_equals_0_category_0 { get; set; }
        public Nullable<bool> combined_mammogram_and_us_final_category_f40_equals_1_category_1 { get; set; }
        public Nullable<bool> combined_mammogram_and_us_final_category_f40_equals_2_category_2 { get; set; }
        public Nullable<bool> combined_mammogram_and_us_final_category_f40_equals_3_category_3 { get; set; }
        public Nullable<bool> combined_mammogram_and_us_final_category_f40_equals_4a_category_4a { get; set; }
        public Nullable<bool> combined_mammogram_and_us_final_category_f40_equals_4b_category_4b { get; set; }
        public Nullable<bool> combined_mammogram_and_us_final_category_f40_equals_4c_category_4c { get; set; }
        public Nullable<bool> combined_mammogram_and_us_final_category_f40_equals_5_category_5 { get; set; }
        public Nullable<bool> combined_mammogram_and_us_final_category_f40_equals_6_category_6 { get; set; }
        public Nullable<bool> biopsy_and_other_evaluation_suggestion_f41_equals_0_no_need_biopsy { get; set; }
        public Nullable<bool> biopsy_and_other_evaluation_suggestion_f41_equals_1_aspiration_cytology { get; set; }
        public Nullable<bool> biopsy_and_other_evaluation_suggestion_f41_equals_2_core_biopsy { get; set; }
        public Nullable<bool> biopsy_and_other_evaluation_suggestion_f41_equals_3_open_biopsy { get; set; }
        public Nullable<bool> biopsy_and_other_evaluation_suggestion_f41_equals_4_mammography { get; set; }
        public Nullable<bool> biopsy_and_other_evaluation_suggestion_f41_equals_5_mri { get; set; }
        public Nullable<bool> biopsy_and_other_evaluation_suggestion_f41_equals_6_other { get; set; }
        public Nullable<bool> pathology_results_f42_equals_0_biopsy { get; set; }
        public Nullable<bool> pathology_results_f42_equals_1_benign { get; set; }
        public Nullable<bool> pathology_results_f42_equals_2_malignant_carcinoma_in_situ { get; set; }
        public Nullable<bool> pathology_results_f42_equals_3_maligant_invasive_cancer { get; set; }
        public Nullable<bool> pathology_results_f42_equals_4_malignant_other { get; set; }
        public Nullable<bool> pathology_results_f42_equals_5_cytology_suspicious { get; set; }
        public Nullable<bool> pathology_results_f42_equals_6_cytology_atypia { get; set; }
        public Nullable<bool> pathology_results_f42_equals_7_cytology_positive { get; set; }
        public Nullable<bool> pathology_results_f42_equals_8_cytology_negative { get; set; }
        public Nullable<bool> pathology_results_f42_equals_9_biopsy_ { get; set; }
        public string overall_summary_f82 { get; set; }
    
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2227:CollectionPropertiesShouldBeReadOnly")]
        public virtual ICollection<breat_cancer_ultrasound_benign_lesions_f16> breat_cancer_ultrasound_benign_lesions_f16 { get; set; }
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2227:CollectionPropertiesShouldBeReadOnly")]
        public virtual ICollection<breat_cancer_ultrasound_tumour_details_f43> breat_cancer_ultrasound_tumour_details_f43 { get; set; }
    }
}
