﻿using Cenarius.Libraries;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Linq;
using System.Web;

namespace Cenarius.Models
{
    public class TableInitializer
    {
        private SqlConnection MyConnection;

        public TableInitializer()
        {
            this.MyConnection = new SqlConnection(Utility.sqlStr);
            this.MyConnection.Open();
        }

        ~TableInitializer()
        {
            this.MyConnection.Close();
        }

        private class ColumnInfo
        {
            public string name { get; set; }
            public string sqlHint { get; set; }
            public bool notNull { get; set; }
            public bool autoIncrement { get; set; }
            public bool primaryKey { get; set; }
            public string foreignRef { get; set; }
            public int maxLen { get; set; }
        }

        private class TableInfo
        {
            public string name { get; set; }
            public List<ColumnInfo> columns { get; set; }
            public List<JObject> rows { get; set; }
        }

        public bool InitializeTables(string postData)
        {
            Debug.WriteLine("InitializeTables()");
            using (SqlTransaction stx = this.MyConnection.BeginTransaction())
            {
                try
                {
                    List<TableInfo> tables = JsonConvert.DeserializeObject<List<TableInfo>>(postData);
                    foreach (TableInfo table in tables)
                    {
                        List<string> columnStrs = new List<string>();
                        foreach (ColumnInfo column in table.columns)
                        {
                            int maxLen = column.maxLen;
                            if (maxLen == 0)
                                maxLen = 512;

                            bool needLen = column.sqlHint == "nvarchar" ||
                                column.sqlHint == "varchar";

                            string colStr =
                                "[" + column.name + "]" +
                                " " + column.sqlHint +
                                (needLen ? ("(" + maxLen + ")") : "") +
                                (column.notNull ? " NOT NULL" : "") +
                                (column.autoIncrement ? " IDENTITY(1,1)" : "") +
                                (column.primaryKey ? " PRIMARY KEY" : "") +
                                (column.foreignRef != null ?
                                " FOREIGN KEY REFERENCES [" + column.foreignRef + "] (id)" : "");

                            columnStrs.Add(colStr);
                        }

                        string columnCmdTxt = string.Join(", ", columnStrs.ToArray());
                        string createTableCmdTxt = "CREATE TABLE [" + table.name + "]" +
                            "(" + columnCmdTxt + ")";
                        SqlCommand createTableCmd = new SqlCommand(createTableCmdTxt, this.MyConnection, stx);

                        // Call Prepare after setting the Commandtext and Parameters.
                        createTableCmd.Prepare();
                        createTableCmd.ExecuteNonQuery();

                        if (table.rows != null)
                        {
                            // Insert these rows into table (so far only EnumOptions has this)
                            string insertRowsCmdTxt = "INSERT INTO [" + table.name + "] ";
                            SqlCommand insertRowsCmd = new SqlCommand(null, this.MyConnection, stx);
                            Dictionary<string, SqlParameter> sqlParams = new Dictionary<string, SqlParameter>();

                            foreach (ColumnInfo column in table.columns)
                            {
                                if (column.name == "id")
                                    continue;

                                SqlDbType sqlType;
                                if (!Utility.SqlHintToSqlType.TryGetValue(column.sqlHint, out sqlType))
                                    throw new Exception("SqlHint \"" + column.sqlHint + "\" could not be mapped to type");

                                SqlParameter sp = new SqlParameter("@" + column.name.Replace(".","_"), sqlType, -1);
                                sqlParams.Add(column.name, sp);
                                insertRowsCmd.Parameters.Add(sp);
                            }

                            List<string> nonIdColumNames = table.columns.Where(cn => cn.name != "id")
                                .Select(c => c.name ).ToList();
                            insertRowsCmdTxt += "(" + (string.Join(", ", nonIdColumNames)) + ")";
                            insertRowsCmdTxt += " VALUES (" + (string.Join(", ", nonIdColumNames.Select(cn => "@" + cn.Replace(".", "_")))) + ")";

                            insertRowsCmd.CommandText = insertRowsCmdTxt;

                            foreach (JObject row in table.rows)
                            {
                                foreach (JProperty prop in row.Properties())
                                {
                                    SqlParameter sp;
                                    if (!sqlParams.TryGetValue(prop.Name, out sp))
                                        throw new Exception("Row property name \"" + prop.Name + "\" not in column spec");
                                    sp.Value = prop.Value;
                                }
                                insertRowsCmd.Prepare();
                                insertRowsCmd.ExecuteNonQuery();
                            }
                        }
                    }

                    stx.Commit();
                    return true;
                }
                catch (Exception e)
                {
                    stx.Rollback();
                    
                    Debug.WriteLine("Failed to create tables for this forma\n" +
                        "Reason: " + e.Message + "\n\n\n" +
                        "Info: " + e.StackTrace);
                    return false;
                }
            }
        }
    }
}