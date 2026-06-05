\[
{
"schemaname": "public",
"tablename": "consultation\_messages",
"policyname": "Authenticated users can insert messages",
"permissive": "PERMISSIVE",
"roles": "{authenticated}",
"command": "INSERT",
"using\_clause": null,
"with\_check\_clause": "true"
},
{
"schemaname": "public",
"tablename": "consultation\_messages",
"policyname": "Patients can view consultation messages",
"permissive": "PERMISSIVE",
"roles": "{authenticated}",
"command": "SELECT",
"using\_clause": "(EXISTS ( SELECT 1\n FROM consultations c\n WHERE ((c.id = consultation\_messages.consultation\_id) AND (c.patient\_id = get\_internal\_user\_id(auth.uid())))))",
"with\_check\_clause": null
},
{
"schemaname": "public",
"tablename": "consultation\_messages",
"policyname": "Staff can update consultation messages",
"permissive": "PERMISSIVE",
"roles": "{authenticated}",
"command": "UPDATE",
"using\_clause": "check\_is\_clinical\_staff(auth.uid())",
"with\_check\_clause": null
},
{
"schemaname": "public",
"tablename": "consultation\_messages",
"policyname": "Staff can view consultation messages",
"permissive": "PERMISSIVE",
"roles": "{authenticated}",
"command": "SELECT",
"using\_clause": "check\_is\_clinical\_staff(auth.uid())",
"with\_check\_clause": null
},
{
"schemaname": "public",
"tablename": "consultations",
"policyname": "Patients can create consultations",
"permissive": "PERMISSIVE",
"roles": "{authenticated}",
"command": "INSERT",
"using\_clause": null,
"with\_check\_clause": "(patient\_id = get\_internal\_user\_id(auth.uid()))"
},
{
"schemaname": "public",
"tablename": "consultations",
"policyname": "Patients can view own consultations",
"permissive": "PERMISSIVE",
"roles": "{authenticated}",
"command": "SELECT",
"using\_clause": "(patient\_id = get\_internal\_user\_id(auth.uid()))",
"with\_check\_clause": null
},
{
"schemaname": "public",
"tablename": "consultations",
"policyname": "Staff can delete consultations",
"permissive": "PERMISSIVE",
"roles": "{authenticated}",
"command": "DELETE",
"using\_clause": "check\_is\_clinical\_staff(auth.uid())",
"with\_check\_clause": null
},
{
"schemaname": "public",
"tablename": "consultations",
"policyname": "Staff can update consultations",
"permissive": "PERMISSIVE",
"roles": "{authenticated}",
"command": "UPDATE",
"using\_clause": "check\_is\_clinical\_staff(auth.uid())",
"with\_check\_clause": null
},
{
"schemaname": "public",
"tablename": "consultations",
"policyname": "Staff can view consultations",
"permissive": "PERMISSIVE",
"roles": "{authenticated}",
"command": "SELECT",
"using\_clause": "check\_is\_clinical\_staff(auth.uid())",
"with\_check\_clause": null
}
]







///\[vite] connecting...
client:912 \[vite] connected.
Consultation-users.jsx:446 \[Chat] fetchConsultation called, internalUserId: e23411fa-9d11-483f-a31b-a1e1dc8f345d
Consultation-users.jsx:472 \[Chat] No active consultation in DB, checking cache...
Consultation-users.jsx:796 \[Chat] Creating consultation with: {patient\_id: 'e23411fa-9d11-483f-a31b-a1e1dc8f345d', consultation\_type: 'dental'}consultation\_type: "dental"patient\_id: "e23411fa-9d11-483f-a31b-a1e1dc8f345d"\[\[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()**defineGetter**: ƒ **defineGetter**()**defineSetter**: ƒ **defineSetter**()**lookupGetter**: ƒ **lookupGetter**()**lookupSetter**: ƒ **lookupSetter**()**proto**: (...)get **proto**: ƒ **proto**()set **proto**: ƒ **proto**()
Consultation-users.jsx:813 \[Chat] Consultation response status: 201 data: {success: true, data: {…}}data: {id: 'f8bddec4-9c76-421f-b1f7-138c6d5639e3', consultation\_type: 'dental', created\_by: 'e23411fa-9d11-483f-a31b-a1e1dc8f345d', patient\_id: 'e23411fa-9d11-483f-a31b-a1e1dc8f345d', patient\_name: 'Jenny L. De Vera', …}success: true\[\[Prototype]]: Object
Consultation-users.jsx:823 \[Chat] Setting active room: f8bddec4-9c76-421f-b1f7-138c6d5639e3 status: ended
Consultation-users.jsx:838 \[Chat] Inserting messages...
Consultation-users.jsx:859 \[Chat] Fetching messages after insert...
Consultation-users.jsx:866 \[Chat] New messages fetched: 83
Consultation-users.jsx:523 \[Chat] Poll: Checking for active consultation for patient: e23411fa-9d11-483f-a31b-a1e1dc8f345d
Consultation-users.jsx:526 \[Chat] Poll: Querying with patient\_id: e23411fa-9d11-483f-a31b-a1e1dc8f345d
Consultation-users.jsx:540 \[Chat] Poll: Active consultations found: \[]
Consultation-users.jsx:549 \[Chat] Poll: All recent consultations: (2) \[{…}, {…}]
Consultation-users.jsx:571 \[Chat] Poll: No active consultation found, showing ended/history
Consultation-users.jsx:523 \[Chat] Poll: Checking for active consultation for patient: e23411fa-9d11-483f-a31b-a1e1dc8f345d
Consultation-users.jsx:526 \[Chat] Poll: Querying with patient\_id: e23411fa-9d11-483f-a31b-a1e1dc8f345d
Consultation-users.jsx:540 \[Chat] Poll: Active consultations found: \[]
Consultation-users.jsx:549 \[Chat] Poll: All recent consultations: (2) \[{…}, {…}]
Consultation-users.jsx:523 \[Chat] Poll: Checking for active consultation for patient: e23411fa-9d11-483f-a31b-a1e1dc8f345d
