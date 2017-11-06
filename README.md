# Cenarius
Excel -> (Intermediate JSON Forma) -> Web Form + SQL DB Schema + Data Binding

## Glossary:
'forma' = Data describing both the form data structure and the schema.

## High priority TODOs:
[x] UI<br>
&nbsp;&nbsp;&nbsp;[x] Generate basic UI elements<br>
&nbsp;&nbsp;&nbsp;[x] Generate editable tabarray interface for subobjects<br>
&nbsp;&nbsp;&nbsp;[x] Enforce basic UI rules (fully tabbable, complex single choice, 'either' groups)<br>
&nbsp;&nbsp;&nbsp;[x] Provide button elements (Summarize -> new tab, Submit, Reset fields)<br>
[.] Core<br>
&nbsp;&nbsp;&nbsp;[x] Form data summarizer<br>
&nbsp;&nbsp;&nbsp;[x] DB schema generator (SQL/NoSQL)<br>
&nbsp;&nbsp;&nbsp;[.] Client side data binding<br>
&nbsp;&nbsp;&nbsp;[.] Server side data binding<br>
&nbsp;&nbsp;&nbsp;[ ] Excel to JSON Forma translator<br>
[ ] Move CenariusForm to server side (JS? C#?)<br>
## To-fix-or-add:
[ ] New field: precise date-time (now only date)<br>
[ ] New field: file upload<br>
[ ] Either-group should clear input whenever switched<br>
## Low priority TODOs:
[ ] Section folding button<br>
[ ] Field validation<br>