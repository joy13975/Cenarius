using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Mvc;
using Cenarius.Models;

namespace Cenarius.Controllers
{
    public class BCUController : Controller
    {
        private CenariusAppDBEntities db = new CenariusAppDBEntities();

        // GET: BCU
        public ActionResult Index()
        {
            return View(db.breat_cancer_ultrasound.ToList());
        }

        // GET: BCU/Details/5
        public ActionResult Details(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            breat_cancer_ultrasound breat_cancer_ultrasound = db.breat_cancer_ultrasound.Find(id);
            if (breat_cancer_ultrasound == null)
            {
                return HttpNotFound();
            }
            return View(breat_cancer_ultrasound);
        }

        // GET: BCU/Create
        public ActionResult Create()
        {
            return View();
        }

        // POST: BCU/Create
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create([Bind(Include = "id,patient_id_f0,patient_name_f1,patient_no_of_checks_today_f2,report_date_f3,report_id_f4,report_no_of_checks_f5,operator_id_f6,interpreter_id_f7,machine_id_f8,us_examination_mode_f9_equals_screening_us,us_examination_mode_f9_equals_diagnostic_us,us_examination_mode_f9_equals_both,C_00_asymptomatic_screening_f10,C_11_pain_f12,C_12_palpable_mass_f13,C_13_discharge_f14,C_20_screening_mammographic_category_f15_equals_0,C_20_screening_mammographic_category_f15_equals_1,C_20_screening_mammographic_category_f15_equals_2,C_20_screening_mammographic_category_f15_equals_3,C_20_screening_mammographic_category_f15_equals_4,C_20_screening_mammographic_category_f15_equals_5,fibroadenoma_f31,fibrocystic_change_f32,cyst_f33,other_f34,C_41_s_p_biopsy_wide_excision_bcs_f36,C_42_s_p_breast_augmentation_reconstruction_f37,C_50_other_reasons_for_breast_sono_examination_f38,us_category_f39_equals_0_category_0,us_category_f39_equals_1_category_1,us_category_f39_equals_2_category_2,us_category_f39_equals_3_category_3,us_category_f39_equals_4a_category_4a,us_category_f39_equals_4b_category_4b,us_category_f39_equals_4c_category_4c,us_category_f39_equals_5_category_5,us_category_f39_equals_6_category_6,combined_mammogram_and_us_final_category_f40_equals_0_category_0,combined_mammogram_and_us_final_category_f40_equals_1_category_1,combined_mammogram_and_us_final_category_f40_equals_2_category_2,combined_mammogram_and_us_final_category_f40_equals_3_category_3,combined_mammogram_and_us_final_category_f40_equals_4a_category_4a,combined_mammogram_and_us_final_category_f40_equals_4b_category_4b,combined_mammogram_and_us_final_category_f40_equals_4c_category_4c,combined_mammogram_and_us_final_category_f40_equals_5_category_5,combined_mammogram_and_us_final_category_f40_equals_6_category_6,biopsy_and_other_evaluation_suggestion_f41_equals_0_no_need_biopsy,biopsy_and_other_evaluation_suggestion_f41_equals_1_aspiration_cytology,biopsy_and_other_evaluation_suggestion_f41_equals_2_core_biopsy,biopsy_and_other_evaluation_suggestion_f41_equals_3_open_biopsy,biopsy_and_other_evaluation_suggestion_f41_equals_4_mammography,biopsy_and_other_evaluation_suggestion_f41_equals_5_mri,biopsy_and_other_evaluation_suggestion_f41_equals_6_other,pathology_results_f42_equals_0_biopsy,pathology_results_f42_equals_1_benign,pathology_results_f42_equals_2_malignant_carcinoma_in_situ,pathology_results_f42_equals_3_maligant_invasive_cancer,pathology_results_f42_equals_4_malignant_other,pathology_results_f42_equals_5_cytology_suspicious,pathology_results_f42_equals_6_cytology_atypia,pathology_results_f42_equals_7_cytology_positive,pathology_results_f42_equals_8_cytology_negative,pathology_results_f42_equals_9_biopsy_,overall_summary_f82")] breat_cancer_ultrasound breat_cancer_ultrasound)
        {
            if (ModelState.IsValid)
            {
                db.breat_cancer_ultrasound.Add(breat_cancer_ultrasound);
                db.SaveChanges();
                return RedirectToAction("Index");
            }

            return View(breat_cancer_ultrasound);
        }

        // GET: BCU/Edit/5
        public ActionResult Edit(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            breat_cancer_ultrasound breat_cancer_ultrasound = db.breat_cancer_ultrasound.Find(id);
            if (breat_cancer_ultrasound == null)
            {
                return HttpNotFound();
            }
            return View(breat_cancer_ultrasound);
        }

        // POST: BCU/Edit/5
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for 
        // more details see https://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit([Bind(Include = "id,patient_id_f0,patient_name_f1,patient_no_of_checks_today_f2,report_date_f3,report_id_f4,report_no_of_checks_f5,operator_id_f6,interpreter_id_f7,machine_id_f8,us_examination_mode_f9_equals_screening_us,us_examination_mode_f9_equals_diagnostic_us,us_examination_mode_f9_equals_both,C_00_asymptomatic_screening_f10,C_11_pain_f12,C_12_palpable_mass_f13,C_13_discharge_f14,C_20_screening_mammographic_category_f15_equals_0,C_20_screening_mammographic_category_f15_equals_1,C_20_screening_mammographic_category_f15_equals_2,C_20_screening_mammographic_category_f15_equals_3,C_20_screening_mammographic_category_f15_equals_4,C_20_screening_mammographic_category_f15_equals_5,fibroadenoma_f31,fibrocystic_change_f32,cyst_f33,other_f34,C_41_s_p_biopsy_wide_excision_bcs_f36,C_42_s_p_breast_augmentation_reconstruction_f37,C_50_other_reasons_for_breast_sono_examination_f38,us_category_f39_equals_0_category_0,us_category_f39_equals_1_category_1,us_category_f39_equals_2_category_2,us_category_f39_equals_3_category_3,us_category_f39_equals_4a_category_4a,us_category_f39_equals_4b_category_4b,us_category_f39_equals_4c_category_4c,us_category_f39_equals_5_category_5,us_category_f39_equals_6_category_6,combined_mammogram_and_us_final_category_f40_equals_0_category_0,combined_mammogram_and_us_final_category_f40_equals_1_category_1,combined_mammogram_and_us_final_category_f40_equals_2_category_2,combined_mammogram_and_us_final_category_f40_equals_3_category_3,combined_mammogram_and_us_final_category_f40_equals_4a_category_4a,combined_mammogram_and_us_final_category_f40_equals_4b_category_4b,combined_mammogram_and_us_final_category_f40_equals_4c_category_4c,combined_mammogram_and_us_final_category_f40_equals_5_category_5,combined_mammogram_and_us_final_category_f40_equals_6_category_6,biopsy_and_other_evaluation_suggestion_f41_equals_0_no_need_biopsy,biopsy_and_other_evaluation_suggestion_f41_equals_1_aspiration_cytology,biopsy_and_other_evaluation_suggestion_f41_equals_2_core_biopsy,biopsy_and_other_evaluation_suggestion_f41_equals_3_open_biopsy,biopsy_and_other_evaluation_suggestion_f41_equals_4_mammography,biopsy_and_other_evaluation_suggestion_f41_equals_5_mri,biopsy_and_other_evaluation_suggestion_f41_equals_6_other,pathology_results_f42_equals_0_biopsy,pathology_results_f42_equals_1_benign,pathology_results_f42_equals_2_malignant_carcinoma_in_situ,pathology_results_f42_equals_3_maligant_invasive_cancer,pathology_results_f42_equals_4_malignant_other,pathology_results_f42_equals_5_cytology_suspicious,pathology_results_f42_equals_6_cytology_atypia,pathology_results_f42_equals_7_cytology_positive,pathology_results_f42_equals_8_cytology_negative,pathology_results_f42_equals_9_biopsy_,overall_summary_f82")] breat_cancer_ultrasound breat_cancer_ultrasound)
        {
            if (ModelState.IsValid)
            {
                db.Entry(breat_cancer_ultrasound).State = EntityState.Modified;
                db.SaveChanges();
                return RedirectToAction("Index");
            }
            return View(breat_cancer_ultrasound);
        }

        // GET: BCU/Delete/5
        public ActionResult Delete(int? id)
        {
            if (id == null)
            {
                return new HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            breat_cancer_ultrasound breat_cancer_ultrasound = db.breat_cancer_ultrasound.Find(id);
            if (breat_cancer_ultrasound == null)
            {
                return HttpNotFound();
            }
            return View(breat_cancer_ultrasound);
        }

        // POST: BCU/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteConfirmed(int id)
        {
            breat_cancer_ultrasound breat_cancer_ultrasound = db.breat_cancer_ultrasound.Find(id);
            db.breat_cancer_ultrasound.Remove(breat_cancer_ultrasound);
            db.SaveChanges();
            return RedirectToAction("Index");
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
