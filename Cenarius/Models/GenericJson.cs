using Microsoft.SqlServer.Server;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Linq;
using static Cenarius.Libraries.Utility;

namespace Cenarius.Models
{
    public class GenericJson
    {
        public string postData { get; set; }

        public void CommitData(SqlConnection conn)
        {
            dynamic data = JsonConvert.DeserializeObject<dynamic>(this.postData);

            return;
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

        Dictionary<string, SqlDbType> SqlHintToType = new Dictionary<string, SqlDbType>()
        {
            {"float", SqlDbType.Float},
            {"integer", SqlDbType.Int},
            {"nvarchar", SqlDbType.NVarChar},
            {"bit", SqlDbType.Bit},
            {"date", SqlDbType.Date}
        };

        public void InitializeTables(SqlConnection conn)
        {
            Debug.WriteLine("InitializeTables()");
            List <TableInfo> tables = JsonConvert.DeserializeObject<List<TableInfo>>(this.postData);
            foreach (TableInfo table in tables)
            {
                List<string> columnStrs = new List<string>();
                foreach (ColumnInfo column in table.columns)
                {
                    int nvarcharMaxLen = column.maxLen;
                    if (nvarcharMaxLen == 0)
                        nvarcharMaxLen = 512;
                    string colStr =
                        "[" + column.name + "]" +
                        " " + column.sqlHint + 
                        (column.sqlHint == "nvarchar" ? "(" + nvarcharMaxLen + ")" : "") +
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

                SqlCommand createTableCmd = new SqlCommand(createTableCmdTxt, conn);

                // Call Prepare after setting the Commandtext and Parameters.
                createTableCmd.Prepare();
                createTableCmd.ExecuteNonQuery();

                if (table.rows != null)
                {
                    // Insert these rows into table (so far only EnumOptions has this)
                    string insertRowsCmdTxt = "INSERT INTO [" + table.name + "] ";
                    SqlCommand insertRowsCmd = new SqlCommand(null, conn);
                    Dictionary<string, SqlParameter> sqlParams = new Dictionary<string, SqlParameter>();

                    foreach (ColumnInfo column in table.columns)
                    {
                        if (column.name == "id")
                            continue;

                        SqlDbType sqlType;
                        if (!SqlHintToType.TryGetValue(column.sqlHint, out sqlType))
                            throw new Exception("SqlHint \"" + column.sqlHint + "\" could not be mapped to type");

                        SqlParameter sp = new SqlParameter("@" + column.name, sqlType, -1);
                        sqlParams.Add(column.name, sp);
                        insertRowsCmd.Parameters.Add(sp);
                    }

                    List<string> nonIdColumNames = table.columns.Select(c => c.name).Where(cn => cn != "id").ToList();
                    insertRowsCmdTxt += "(" + (string.Join(", ", nonIdColumNames)) + ")";
                    insertRowsCmdTxt += " VALUES (" + (string.Join(", ", nonIdColumNames.Select(cn => "@" + cn))) + ")";

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
        }
    }
}