\[TODO] - MediTrack Implementation Status

\===========
COMPLETED ITEMS ✅============
=============================

General:

* [x] add a notification for the whole system in the header.put it next to the profil
* [x] ~~fix the profile setup to upload all the content into the database some contents are not uploading properly~~
* [x] ~~fix the dashboard.jsx to fill the whole screen.~~
* [x] ~~add aditional information in the profile setup. : Dose(1st, 2nd 3rd, booster1, booster2), Name of Vaccine, Date; emergency contact: relationship and address; for users: Home address, Religion, Nationality, Civil status~~
* [x] ~~make the examinations and approvals page work.~~
* [x] ~~fix the color mismatch of the logo.~~
* [x] Connect the dashboard to the database.
* [x] ~~understand how to make sure that the records gets saved in the database and when another examination happened the old records becomes a read only and cannot be edited.~~
* [x] ~~add students classification (regular, irreg, and returning).~~
* [x] make it role based access.
* [x] add records management for the admin, logs,
* [x] add ui for the meditrackocr
* [x] use the DentalExaminationReport for the dental
* [x] ~~fix the approved appointment sections where its appearing collapsed even though it shouldn't be collapsed by default.~~
* [x] make it so it also filter the appointment for dentist to only see appointments with dental related concerns
* [x] Canceled - Missed Penalty for spam booking
* [x] ~~only one appointment at a time users cannot send multiple appointment until the active appointment is not yet finished.~~
* [x] fix the modal for the request appointment.
* [x] remove the calendar
* [x] ~~add a prompt asking users about their concern then it should redirect to the conversation for dentist or doctors/nurses. the prompt is asking user about what type of help do they need. then based on what they choose. so make the consultation for admin-clinic to have 2 instance for doctors/ dentist. admin can see both instance of conversation.~~
* [x] ~~make the add records work, make it similar to signup but with no OCR and there should be temporary password given that they can change later on.~~
* [x] ~~add a filter for year level, section,~~
* [x] ~~display prev records of the patients (medical and dental)~~
* [x] ~~add filter for roles, year level and section. and ascending or decending order of reords.(the roles is not working properly) add filter for the program~~
* [x] display the medical and dental examinations summary
* [x] display their medical certificate.
* [x] make the med cert be downloadable as pdf
* [x] add plsp logo in the medical certificate
* [x] the part of school year is still missing identify how can we set the general schoolyear for the system (maybe add a settings page for that where we can set the school year at the start of enrollment.)
* [x] ~~it will be a subcollection of users. medical examination and dental examination.~~
* [x] ~~make the examination saves in the database.~~
* [x] ~~make the dental examination saves in the database.~~
* [x] ~~connects with approvals page~~
* [x] ~~the vitals didnt save properly to the database.~~
* [x] ~~use the component DatePicker.jsx for the medical and dental file.~~
* [x] understand the dental history which files are included for the dental history.
* [x] ~~make this module better.~~
* [x] ~~the storage for the image is still unknown. ; firebase storage~~
* [x] change the layout of the cards square img the text is on the right side of the image
* [x] make the table scrollable.
* [x] Add Time of examination
* [x] add medical history (consultation log (name, purpose, doctor, date and time)
* [x] fix the edit modal for all the informations
* [x] make the content scrollable
* [x] the displaying of announcement.
* [x] Add Record management for admin only in which we can see all the records in the systems and be able to delete records.
* [x] the profile setup. it should be middle name and age couldn't be negative number and should be realistic.
* [x] user profile should be marked as yellow if theres a empty or null information.
* [x] the profile-users. when i tried to edit a certain container it should only update that specific part of profile user not the complete page. because its currently saving the complete data so some fields becomes null since if i only edited the emergency contact the personal and academic information becomes null since when save changes is clicked all the payload includes everything, section it so that only the edited info is posted on the database.
* [x] for the empty info the container for that should be marked as yellow as warning indicating that it needs to be filled in.
* [x] records should be set as all department by default.
* [x] fix the dental exam report.
* [x] the appointments isnt showing up in the calendar
* [x] reports should be downloadable by categories(each categories should have downloads button)
* [x] update the user management to be able to update users just like how its done in profile setup, some inputs should be dropdowns.
* [x] user names is not showing properly in the audit logs and
* [x] add archives
* [x] consultation management. he can oversees both dental and medical conversations.(he can delete the whole conversation)
* [x] make new file appointment management, consultations management and approval management, basically everything the system have should be manageable within the admin side UI.
* [x] make the settings functional
* [x] forgot password function
* [x] the university id didn't saved properly.
* [x] merge the approvals and dental approval
* [x] for the clinical profile can it be more detailed displaying all the informations that each users have. the users table is this one C:\Users\HP\MediTrack\sql\users\_table.sql and for the visit history it should be a singular modal or container that displays all the details of their medical and dental history from the dental and medical records. so when the visit history is viewed by the clinic staff all they have to do is scroll down to see the records separated by tables. showing the most important data from each consultation.
* [x] for the address for personal information and emergency contact i want it to use the C:\Users\HP\MediTrack\frontend\src\components\AddressModal.jsx for picking address.
* [x] the exam date should be the same as "created at"
* [x] make the archive function works, i have a database table for archives C:\Users\HP\MediTrack\sql\archives\_table.sql i want all the admin pages like : records, announcements, consultations, appointments, approvals, user management, they all have delete functionalities. i want to make it so that whenever use(admin) deletes anything it goes to archives first. make a .md file on what needs to be done phase by phase..... can we do it so that all tables have isArchived column, and whenever admin deletes its set to true but by default its false. then the archive function still be the same where in it saved the item into the archives table. so when archive is toggle all the page will just show the isArchived == false meaning admin cna only see all the deleted(archived file) in the archives page and all the not deleted items will be shown in other pages such as appointments, approvals, users management etc..
* [x] make the tooth condition shows, from the tooth data from the database.
* [x] remove the Previous Dental Visit, Dental Procedures Done, Patient Signature from the Dental Examination Details.
* [x] just like the medical examination details, add "Past Dental Records" for the Dental Examination Details.

dentist/doctor:

* [x] records should be set as all department by default.
* [x] fix the dental exam report.
* [x] the appointments isnt showing up in the calendar

admin:

* [x] reports should be downloadable by categories(each categories should have downloads button)
* [x] update the user management to be able to update users just like how its done in profile setup, some inputs should be dropdowns.
* [x] user names is not showing properly in the audit logs and
* [x] add archives
* [x] consultation management. he can oversees both dental and medical conversations.(he can delete the whole conversation)
* [x] make new file appointment management, consultations management and approval management, basically everything the system have should be manageable within the admin side UI.

user:

* [x] user records should have some type of filter to sort from latest to oldest or something.
* [x] the program should be complete name, Bachealor of Science in.. for th profile user edit information

appointments:

* [x] add a search bar for the approved appointments.

\==========
PENDING ITEMS 📋=============as of 07/17/26
===========================================

General:

* [ ] push notification
* [ ] caching (redis/ sql lite) - SQLite guide created: docs/sqlite-offline-mode-guide.md
* [ ] validation for the name in which number shouldn't be able to be typed in to, the ID shouldn't have character aside from "-" and numbers.
* [ ] normalize the text for the name so it can't be capitalized or all lowercase.
* [ ] make the settings functional
* [ ] forgot password function (needs implementation verification)
* [ ] update the certificate for both medical and dental make sure its displaying in the system as if its on pdf already especailly the approved certificate on the user side
* [ ] also make the process of approving dental to have an option just like the medical to either only approve and not issue certificate or both.
* [ ] the visit history for both medical and dental is still funcked up
* [ ] have a way for doctor, dentist and nurse accounts to have a way of adding their lincense numbers into the system so that it automatically be inserted on the examination form
* [ ] make the details for the pending appointments to be a little bit bigger for it to be easy to view
* [ ] for the consultations.jsx i want to make it just like the consultation-users.jsx where in not all the previous chat loads all at the same time, when you scroll up you discover and loads more previous messages.
* [ ] remove the 'date' from the dental examination form, only leave the examination date and examination time.

Consultation & Consultation-users:

* [ ] add a notification for new messages arriving(use notifier.js)
* [x] add seen indicator for when the other party saw the message
* [x] add seen indicator for the consultation.
* [x] make sure to redirect link that are sent in the threads like a google meet link. (just like messenger by meta)
* [ ] improve the records drawer inside the thread conversation as well as adding visit history on it.

Records-user:

* [ ] settings page idea: the settings page should include a input for the admin to set the current School year
* [ ] the uploading of health documents is not working

User-management:

* [ ] add a functionality to delete or edit users informations, but it should be archived.

Profile-user:

* [ ] the uploading of health documents is not working

For Future development:

* [ ] This will store all the previous records of students and employees and it should be deleted 4-5 years after graduation(for student) after no longer working (for employee

user:

* [ ] make the consultation and appointment be only accessible if theres already a medical or dental record for that account.
* [x] user homepage, the pending and approved booking should show
* [ ] user notifications

dentist/doctor:

* [x] add a search bar for the approved appointments.

admin:

* [ ] when admin edits the info it should show as well who updates the informations.
* [ ] add new feature wherein the examination.jsx both dental and medical forms can be edited. if in the future the medical form and dental form has been changed, admin can do that too. if the questions are changed, etc etc.
* [ ] archive : add functionality for all the tables to saved the name of the deleted\_by just like the medical and dental
* [ ] for the audit logs i want to have atleast 1 week retention for the logs before it get sent to the archive and then after another 1 week it gets permanently deleted.

general:

* [ ] add a button for clinic staffs to choose the type of semester its on. use school calendar, 2025-2026 1st sem, 2nd sem, or something like that.
* [ ] make sure to use school year for the dashboard,(with everything)
* [ ] add suffix to medical and dental records
* [x] make the visit history more detailed. the intraoral and tooth data should be visible and shown
* [ ] medical approval... editing examination details????
* [ ] the name for the medical and dental certificate should be set in the admin side.
* [x] should i add a issue\_cert column on the database and so if in the approvals doctor or dentist clicks no, approved only. the issue\_cert stays as false. then one the Issue Certificate button is chosen
  then the value becomes false. so that i can accurately display on the user side whether theres a certficate or not.
* [ ] add a edit functionality for the Approval management to change the status wthere approved or pending
* [ ] the report still sending meaning the database issue\_cert is not being udpated whenever the approval goes through the isapproved is the only thing being updated not the issue\_\_cert
* [ ] add reject in the Approvals.
* [x] for the profile drawer for clinic staffs (doctor, dentist, nurse and including admin) should be just like the Profile-users.jsx wherein the edit form is section (personal details, professional info, contact info, emergency contact, vacinnation history, and dental history)  so that the payload for updating information is smaller and so not all the info is being updated only a specific section. for the professional information i want to add License number. since doctor, dentist and nurses have their license number to work. also provide the sql query to add the license column into the users table.
* [ ] use the components for the profile drawer(AddressModal.jsx
* [x] add a license number for the profile drawer for all the clinic staffs in the headers.jsx
* [ ] add reject for the appointments
* [ ]  And just like the Profile-users.jsx the incomplete items in the profile drawer should be marked. and there should be an option 'N/A" for the Vacinnation and dental history if that item isnt
  applicable to them.
* [ ] add an indicator for the incomplete record in profildrawer

# ===============testing(07/18)===============

* [x] consultation management, appointment mangement, approvals search bar needs to go back to default state
* [x] appointment mangement filter needs fixing
* [x] user management edit dont save into the database
* [x] usermanagement date picker
* [ ] user management add user isnt working
* [ ] do better for the excel export
* [ ] in reports when the user is archive it should not be part of the reports same with the medical exams and dentals
* [ ] for the ocr if the id file is too large show a message to tell the user to screenshot the id or something
* [ ] for the user management add button to add confirmation email to send email to vefiy the login
* [x] profile-user is scrolling sometimes i need to swipe in specific space
* [x] appointment- once the appointment is marked as done and missed it shouldn't be able to interact or examine
* [ ] refresh the consultation seamlessly, and seen indicator for the&#x20;
* [x] school year for the examination
* [ ] medical exam phase 2 questionaire it shouldn't have answer by default
* [ ] make sure to have required indicator for the examination form
* [x] the remarks is not showing up in summary of exam
* [x] approval of examination records is not saving the user\_id.&#x20;
* [ ] hide dental history if user has selected the n/a in their profile-user or when the dental\_history has the data "declined": true,

  &#x20;if its "declined": false then the dental history should reflect on the dental examination&#x20;
* [ ] priority to fix the examination for both medical and dental. simplify and clean the forms.
* [x]  examination should be one phase only which includes. Past Medical History,Family History, Personal / Social History,Health History Questions, Do you have or have you had any of the following?,
  Laboratory Results, Anthropometric Measurements & Vital Signs, Last Menstrual Period (LMP) — Females only, basically all of the phase 2 plus Past Medical History,Family History, Personal / Social
  History.
* [ ] past surgical history should be added in the users table. and be added on the profile-users,jsx under the dental history,
* [x] remove the school year in medical.jsx
* [ ] i need to make sure that the ocr settings saves into the database.
* [ ] if the nurse is the one conductiong the examination, the nurse on duty should be his/her name, if doctor is the one conducting the examination then the physician name and license number should be in the form and the nurse on duty should be a dropdown of all the roles = nurse in the system.
* [ ] in the approvals, instead of edit button it should be view to view full examination details and the same medical modal should open up with the details already present in the medical\_records table. so that if the doctor wants to edit the form he/she can.
* [ ] in medical.jsx the patients demographics, Person to Contact in Case of Emergency , COVID-19 Vaccine History and past surgical history shouldn't be editable.
* [ ] add COVID-19 History where user can type the time they get infected, treatment, and other details in the Profile-users.jsx in vacinnations column in users table
* [ ] Last Menstrual Period (LMP) should only show up if the sex of the patient is Female else hide it.&#x20;
* [x] the exam date and exam time should automatically shown and be the date and time that the examination is happening so that doctors dont have to click it it just shows but they can still access it the same. (meaning even if theres already date and time on it. when they click it the datepicker shuld still open if it needs to be change)
* [ ] fix the visit history.
* [x] in the Medical.jsx, the of exam\_date and exam\_time. currently theres no exam time in the database medical\_records column and examdate is based on created\_at. make sure that the exam date and exam time is being saved properly.
* [ ] make sure to check if the edit function is working for the admin page

# ===============ROLE MATRIX===============

| Page                    | admin          | doctor                 | dentist                | nurse                  | student/staff |
| :---------------------- | :------------- | :--------------------- | :--------------------- | :--------------------- | :------------ |
| **ADMIN PAGES**         |                |                        |                        |                        |               |
| Dashboard               | ✅              | ❌                      | ❌                      | ❌                      | ❌             |
| User Management         | ✅              | ❌                      | ❌                      | ❌                      | ❌             |
| Audit Logs              | ✅              | ❌                      | ❌                      | ❌                      | ❌             |
| OCR Settings            | ✅              | ❌                      | ❌                      | ❌                      | ❌             |
| Records                 | ❌              | Med Only               | Dent Only              | Med Only               | ❌             |
| Record Management       | ✅              | ❌                      | ❌                      | ❌                      | ❌             |
| Appointments            | ❌              | ✅                      | ✅                      | ✅                      | ❌             |
| Appointment Management  | ✅              | ❌                      | ❌                      | ❌                      | ❌             |
| Examinations            | ❌              | ✅                      | ✅                      | ❌                      | ❌             |
| Approvals               | ❌              | ✅                      | ✅                      | ✅                      | ❌             |
| Approval Management     | ✅              | ❌                      | ❌                      | ❌                      | ❌             |
| Consultations           | ❌              | ✅                      | ✅                      | ✅                      | ❌             |
| Consultation Management | ✅              | ❌                      | ❌                      | ❌                      | ❌             |
| Announcements           | manage         | View                   | View                   | View                   | View          |
| Archives                | ✅              | ❌                      | ❌                      | ❌                      | ❌             |
| Reports                 | ✅              | ❌                      | ❌                      | ❌                      | ❌             |
| Settings                | admin settings | clinic staffs settings | clinic staffs settings | clinic staffs settings | user settings |
| **USER PAGES**          |                |                        |                        |                        |               |
| Home (Meditrack)        | ❌              | ❌                      | ❌                      | ❌                      | ✅             |
| Appointment Booking     | ❌              | ❌                      | ❌                      | ❌                      | ✅             |
| My Records              | ❌              | ❌                      | ❌                      | ❌                      | ✅             |
| Profile                 | ❌              | ❌                      | ❌                      | ❌                      | ✅             |
| Consultations/Chat      | ❌              | ❌                      | ❌                      | ❌                      | ✅             |
| Settings (User)         | ❌              | ❌                      | ❌                      | ❌                      | ✅             |

**Access:** ✅ = Full Access | ❌ = No Access | Med Only = Medical only | Dent Only = Dental only | View = View only | manage = create/edit/delete

settings has different access level thats why its diffrent for each roles

\=================
TEST ACCOUNTS===============
============================

Accounts:

<dekbermas@gmail.com> sysadmin
[jamescantre@gmail.com](mailto:john.doe@example.com) doctor

<smcrm521@gmail.com> nurse
<catherine@gmail.com> dentist

<ly.jxnny@gmail.com> student

password -1234567890

frontend\src\features\admin-clinic\Examination\Medical.jsx

frontend\src\features\admin-clinic\Records.jsx

frontend\src\features\admin-clinic\Approvals.jsx

frontend\src\features\admin-clinic\ApprovalManagement.jsx

frontend\src\features\users\Records-users.jsx

frontend\src\features\admin-clinic\Archives.jsx

frontend\src\features\admin-clinic\Record-Management.jsx

frontend\src\features\admin-clinic\Dashboard.jsx
