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
        private string mainTableName;
        private SqlConnection connection;
        private const string EnumOptionsSuffix = ".enum_options";

        Dictionary<string, SqlDbType> SqlHintToSqlType = new Dictionary<string, SqlDbType>()
        {
            {"float", SqlDbType.Float},
            {"integer", SqlDbType.Int},
            {"nvarchar", SqlDbType.NVarChar},
            {"bit", SqlDbType.Bit},
            {"date", SqlDbType.Date}
        };

        private class DataSet
        {
            public string mainTableName { get; set; }
            public List<DataNode> data { get; set; }
        }

        private class DataNode
        {
            public string name { get; set; }
            public string sqlHint { get; set; }
            public string value { get; set; }
            public JObject instances { get; set; }
        }

        private int AttemptToAddEnumOption(DataNode enumDNode)
        {
            Debug.WriteLine("AttemptToAddEnumOption()");

            // First check whether we're allowed to add a new entry
            string fidPName = "@fieldID";
            string selAllowNewEntryCmdTxt = "SELECT * FROM [" + this.mainTableName + EnumOptionsSuffix + "] " +
                    "WHERE fieldID = " + fidPName;
            SqlCommand selAllowNewEntryCmd = new SqlCommand(selAllowNewEntryCmdTxt, this.connection);
            selAllowNewEntryCmd.Parameters.Add(fidPName, SqlDbType.NVarChar, -1).Value = enumDNode.name + "::AllowNewEntry";
            selAllowNewEntryCmd.Prepare();

            List<int> ids = new List<int>();
            List<string> aneVals = new List<string>();
            using (SqlDataReader sdr = selAllowNewEntryCmd.ExecuteReader())
            {
                while (sdr.Read())
                {
                    ids.Add(sdr.GetInt32(0));
                    aneVals.Add(sdr.GetString(2));
                }
            }

            if (aneVals.Count < 1)
            {
                // Should not be; every enum creates one 
                // AllowNewEntry row
                throw new Exception("Could not find ::AllowNewEntry value for enum");
            }
            else if (aneVals.Count == 1)
            {
                // Normal
                bool allowed = aneVals.ElementAt(0).ToLower() == "true";
                if (!allowed)
                {
                    throw new Exception("Adding new Enum Option is not allowed");
                }
                else
                {
                    // Add new entry and return ID
                    string valPName = "@value";
                    string addAllowNewEntryCmdTxt = "INSERT INTO [" + this.mainTableName + EnumOptionsSuffix + "] " +
                        "(fieldID, value) " +
                        "OUTPUT INSERTED.id " +
                        "VALUES (" + fidPName + "," + valPName + ")";
                    SqlCommand addAllowNewEntryCmd = new SqlCommand(addAllowNewEntryCmdTxt, this.connection);
                    addAllowNewEntryCmd.Parameters.Add(fidPName, SqlDbType.NVarChar, -1).Value = enumDNode.name;
                    addAllowNewEntryCmd.Parameters.Add(valPName, SqlDbType.NVarChar, -1).Value = enumDNode.value;
                    addAllowNewEntryCmd.Prepare();

                    int newEnumOptionID = (int)addAllowNewEntryCmd.ExecuteScalar();

                    Debug.WriteLine("Created new Enum Option with id: " + newEnumOptionID);
                    return newEnumOptionID;
                }
            }
            else
            {
                string dbgStr = "IDs: (" + string.Join(", ", ids.Select(id => id.ToString()).ToList()) + ")" +
                    ", Values: (" + string.Join(", ", aneVals) + ")";
                throw new Exception("Found multiple ::AllowNewEntry value for enum: \n" + dbgStr);
            }
        }

        private int QueryEnumOptions(DataNode enumDNode)
        {
            Debug.WriteLine("QueryEnumOptions()");

            // Enum field references id of EnumOptions as FKey
            // Try to find matching fieldID and value, if not found
            // then try to add new if possible
            string fidPName = "@fieldID";
            string valPName = "@value";
            string selEnumOptionCmdTxt = "SELECT id FROM [" + this.mainTableName + EnumOptionsSuffix + "] " +
                "WHERE fieldID = " + fidPName + " " +
                "AND value = " + valPName;

            SqlCommand selEnumOptionCmd = new SqlCommand(selEnumOptionCmdTxt, this.connection);
            selEnumOptionCmd.Parameters.Add(fidPName, SqlDbType.NVarChar, -1).Value = enumDNode.name;
            selEnumOptionCmd.Parameters.Add(valPName, SqlDbType.NVarChar, -1).Value = enumDNode.value;
            selEnumOptionCmd.Prepare();

            List<int> foundIDs = new List<int>();
            using (SqlDataReader sdr = selEnumOptionCmd.ExecuteReader())
                while (sdr.Read())
                    foundIDs.Add(sdr.GetInt32(0));

            if (foundIDs.Count < 1)
            {
                // Not found - now test whether it's possible 
                // to add current value as a new entry
                Debug.WriteLine("Enum value entry not found...");

                return AttemptToAddEnumOption(enumDNode);
            }
            else if (foundIDs.Count == 1)
            {
                // Normal
                return foundIDs.ElementAt(0);
            }
            else // > 1
            {
                // Corrupted EnumOptions - more than one entries found
                string idStr = string.Join(", ", foundIDs.Select(id => id.ToString()).ToList());
                throw new Exception("More than one EnumOptions entries found; ids are:\n" + idStr);
            }
        }

        private void CommitToTable(string tableName, List<DataNode> dns)
        {
            Debug.WriteLine("CommitToTable(): currentTableName");

            // Insert these rows into table (so far only EnumOptions has this)
            List<string> colNames = dns.Select(dn => dn.name).ToList();
            string insertRowsCmdTxt = "INSERT INTO [" + tableName + "] " +
                 "(" + (string.Join(", ", colNames)) + ")" +
                 " VALUES (" + (string.Join(", ", colNames.Select(cn => "@" + cn))) + ")";
            SqlCommand insertRowsCmd = new SqlCommand(insertRowsCmdTxt, this.connection);

            foreach (DataNode dn in dns)
            {
                SqlParameter sp;
                if (dn.sqlHint == "enum")
                {
                    Debug.WriteLine("Enum field: " + dn.name + ", val: " + dn.value);

                    sp = new SqlParameter("@" + dn.name, SqlDbType.Int, -1);
                    sp.Value = this.QueryEnumOptions(dn);
                }
                else
                {
                    Debug.WriteLine("Regular " + dn.sqlHint + " field: " + dn.name + ", val: " + dn.value);

                    SqlDbType sqlType;
                    if (!SqlHintToSqlType.TryGetValue(dn.sqlHint, out sqlType))
                        throw new Exception("SqlHint \"" + dn.sqlHint + "\" could not be mapped to type");
                    sp = new SqlParameter("@" + dn.name, sqlType, -1);
                    sp.Value = dn.value;
                }

                insertRowsCmd.Parameters.Add(sp);
            }

            insertRowsCmd.Prepare();
            insertRowsCmd.ExecuteNonQuery();
        }

        private void TraverseDataNodes(string currentTableName, List<DataNode> dns)
        {
            Debug.WriteLine("TraverseDataNodes()");

            // Data values for the main table gets committed first 
            // due to FKey dependencies
            List<DataNode> fields = dns.Where(dn => dn.sqlHint != "subobject").ToList();
            CommitToTable(currentTableName, fields);

            // Recurse into SOs after fields are committed
            List<DataNode> sos = dns.Where(dn => dn.sqlHint == "subobject").ToList();

            foreach (DataNode so in sos)
            {
                string tableName = currentTableName + "." + so.name;
                List<string> instanceKeys = so.instances.Properties().Select(c => c.Name).ToList();

                foreach (string ik in instanceKeys)
                {
                    // This loop is one SO instance
                    List<DataNode> inst = so.instances[ik].ToObject<List<DataNode>>();
                    TraverseDataNodes(tableName, inst);
                }
            }

            return;
        }

        public void CommitData(SqlConnection conn)
        {
            Debug.WriteLine("CommitData()");
            DataSet ds = JsonConvert.DeserializeObject<DataSet>(this.postData);

            this.connection = conn;
            this.mainTableName = ds.mainTableName;

            this.TraverseDataNodes(ds.mainTableName, ds.data);

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

        public void InitializeTables(SqlConnection conn)
        {
            Debug.WriteLine("InitializeTables()");
            List<TableInfo> tables = JsonConvert.DeserializeObject<List<TableInfo>>(this.postData);
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
                        if (!SqlHintToSqlType.TryGetValue(column.sqlHint, out sqlType))
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