# Cenarius
Excel -> (Intermediate JSON Forma) -> Web Form + SQL DB Schema

## Glossary:
'forma' = Data describing both the form data structure and the schema.

## High priority TODOs:
[.] UI<br/>
&nbsp;&nbsp;&nbsp;[x] Generate basic UI elements<br/>
&nbsp;&nbsp;&nbsp;[x] Generate editable tabarray interface for subobjects<br/>
&nbsp;&nbsp;&nbsp;[x] Enforce basic UI rules (fully tabbable, complex single choice, 'either' groups)<br/>
&nbsp;&nbsp;&nbsp;[.] Provide button elements (Summarize -> new tab, Submit, Reset fields)<br/>
[ ] Core<br/>
&nbsp;&nbsp;&nbsp;[ ] Form data summarizer<br/>
&nbsp;&nbsp;&nbsp;[ ] DB schema generator (SQL/NoSQL is infact easier for the current data structure)<br/>
&nbsp;&nbsp;&nbsp;[ ] Excel to JSON Forma translator<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[ ] Determine how to represent the forma in Excel grids<br/>
[ ] Move CenariusForm to server side (JS? C#?)<br/>
[ ] Data binding from UI to Model<br/>
<br/>
## Low priority TODOs:<br/>
[ ] Section folding button
[ ] Field validation<br/>
[ ] Fine grain form generation controls<br/>
&nbsp;&nbsp;&nbsp;[ ] Subobject minimum instances<br/>
&nbsp;&nbsp;&nbsp;[ ] ...<br/>