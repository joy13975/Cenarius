﻿//------------------------------------------------------------------------------
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
    using System.Data.Entity;
    using System.Data.Entity.Infrastructure;

    public partial class CenariusAppDBEntities : DbContext
    {
        public CenariusAppDBEntities()
            : base("name=CenariusAppDBEntities")
        {
            this.Database.Connection.ConnectionString =
                this.Database.Connection.ConnectionString.Replace("_lol_pwd_", "YouAreNotPrepared555");
        }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            throw new UnintentionalCodeFirstException();
        }

        public virtual DbSet<breat_cancer_ultrasound> breat_cancer_ultrasound { get; set; }
        public virtual DbSet<breat_cancer_ultrasound_benign_lesions_f16> breat_cancer_ultrasound_benign_lesions_f16 { get; set; }
        public virtual DbSet<breat_cancer_ultrasound_benign_lesions_f16_test_so_lv2_f17> breat_cancer_ultrasound_benign_lesions_f16_test_so_lv2_f17 { get; set; }
        public virtual DbSet<breat_cancer_ultrasound_tumour_details_f43> breat_cancer_ultrasound_tumour_details_f43 { get; set; }
    }
}