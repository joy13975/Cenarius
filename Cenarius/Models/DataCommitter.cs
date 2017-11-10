using Cenarius.Libraries;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Linq;

namespace Cenarius.Models
{
    public class DataCommitter
    {
        private string MainTableName;
        private string EnumOptionsTableName;
        private SqlConnection MyConnection;
        private SqlTransaction MyTransaction;

        public DataCommitter(SqlConnection conn)
        {
            this.MyConnection = conn;
            this.MyTransaction = conn.BeginTransaction();
        }

        private class ParentRecord
        {
            public ParentRecord(string tableName, int id)
            {
                this.tableName = tableName;
                this.id = id;
            }

            public string tableName { get; set; }
            public int id { get; set; }
        }

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
            string selAllowNewEntryCmdTxt = "SELECT * FROM [" + this.EnumOptionsTableName + "]" +
                    " WHERE fieldID = " + fidPName;
            SqlCommand selAllowNewEntryCmd =
                new SqlCommand(selAllowNewEntryCmdTxt, this.MyConnection, this.MyTransaction);
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
                    throw new Exception("Adding new Enum Option is not allowed\n" +
                        "Enum Name: " + enumDNode.name + ", Value: " + enumDNode.value);
                }
                else
                {
                    // Add new entry and return ID
                    string valPName = "@value";
                    string addAllowNewEntryCmdTxt = "INSERT INTO [" + this.EnumOptionsTableName + "]" +
                        " (fieldID, value)" +
                        " OUTPUT INSERTED.id" +
                        " VALUES (" + fidPName + "," + valPName + ")";
                    SqlCommand addAllowNewEntryCmd =
                        new SqlCommand(addAllowNewEntryCmdTxt, this.MyConnection, this.MyTransaction);
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
            string selEnumOptionCmdTxt = "SELECT id FROM [" + this.EnumOptionsTableName + "]" +
                " WHERE fieldID = " + fidPName +
                " AND value = " + valPName;

            SqlCommand selEnumOptionCmd =
                new SqlCommand(selEnumOptionCmdTxt, this.MyConnection, this.MyTransaction);
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

        private int CommitToTable(string tableName, List<DataNode> dns, ParentRecord pr)
        {
            bool hasParent = pr != null;
            int prId = hasParent ? pr.id : -1;
            Debug.WriteLine("CommitToTable(" + tableName + ", [dns], " + prId + ")");

            // Insert these rows into table (so far only EnumOptions has this)
            List<string> colNames = dns.Select(dn => dn.name).ToList();
            SqlCommand insertRowsCmd = new SqlCommand(null, this.MyConnection, this.MyTransaction);

            // If parent is not null then we need an FKey column
            if (hasParent)
            {
                string fkeyColName = pr.tableName + "_ref";
                colNames.Insert(0, fkeyColName);

                insertRowsCmd.Parameters.Add("@" + fkeyColName.Replace(".", "_"), SqlDbType.Int, -1).Value = pr.id;
            }

            string insertRowsCmdTxt = "INSERT INTO [" + tableName + "]" +
                 " (" + (string.Join(", ", colNames.Select(cn => "[" + cn + "]").ToList())) + ")" +
                 " OUTPUT INSERTED.id" +
                 " VALUES (" + (string.Join(", ", colNames.Select(cn => "@" + cn.Replace(".", "_")))) + ")";

            insertRowsCmd.CommandText = insertRowsCmdTxt;

            foreach (DataNode dn in dns)
            {
                if (dn.sqlHint == "enum")
                {
                    Debug.WriteLine("Enum field: " + dn.name + ", val: " + dn.value);

                    insertRowsCmd.Parameters.Add("@" + dn.name, SqlDbType.Int, -1).Value =
                        this.QueryEnumOptions(dn);
                }
                else
                {
                    Debug.WriteLine("Regular " + dn.sqlHint + " field: " + dn.name + ", val: " + dn.value);

                    SqlDbType sqlType;
                    if (!Utility.SqlHintToSqlType.TryGetValue(dn.sqlHint, out sqlType))
                        throw new Exception("SqlHint \"" + dn.sqlHint + "\" could not be mapped to type");
                    insertRowsCmd.Parameters.Add("@" + dn.name.Replace(".", "_"), sqlType, -1).Value = dn.value;
                }
            }

            insertRowsCmd.Prepare();
            int insertedId = (int)insertRowsCmd.ExecuteScalar();

            Debug.WriteLine("Insert success; ID=" + insertedId);
            return insertedId;
        }

        private void VisitDataNodes(string currentTableName, List<DataNode> dns, ParentRecord pr = null)
        {
            Debug.WriteLine("TraverseDataNodes()");

            // Data values for the main table gets committed first 
            // due to FKey dependencies
            List<DataNode> fields = dns.Where(dn => dn.sqlHint != "subobject").ToList();
            int objId = CommitToTable(currentTableName, fields, pr);
            ParentRecord newPR = new ParentRecord(currentTableName, objId);

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
                    VisitDataNodes(tableName, inst, newPR);
                }
            }

            return;
        }

        public void CommitData(string postData)
        {
            Debug.WriteLine("CommitData()");
            DataSet ds = JsonConvert.DeserializeObject<DataSet>(postData);

            this.MainTableName = ds.mainTableName;
            this.EnumOptionsTableName = MainTableName + Utility.EnumOptionsSuffix;

            try
            {
                this.VisitDataNodes(ds.mainTableName, ds.data);
                this.MyTransaction.Commit();
            }
            catch(Exception e)
            {
                this.MyTransaction.Rollback();

                Debug.WriteLine(e.Message);
                Debug.WriteLine(e.StackTrace);
                throw new Exception("Failed to submit data\n" +
                    "Reason: " + e.Message + "\n\n\n" +
                    "Info: " + e.StackTrace);
            }
        }
    }
}