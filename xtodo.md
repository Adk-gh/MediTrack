\[TODO]



* [x] add a notification for the whole system in the header.put it next to the profil
* [x] ~~fix the profile setup to upload all the content into the database some contents are not uploading properly~~
* [x] ~~fix the dashboard.jsx to fill the whole screen.~~
* [x] ~~add aditional information in the profile setup. : Dose(1st, 2nd 3rd, booster1, booster2), Name of Vaccine, Date; emergency contact: relationship and address; for users: Home address, Religion, Nationality, Civil status~~
* [x] ~~make the examinations and approvals page work.~~
* [x] ~~fix the color mismatch of the logo.~~
* [x] Connect the dashboard to the database.
* [x] ~~understand how to make sure that the records gets saved in the database and when another examination happened the old records becomes a read only and cannot be edited.~~
* [x] ~~add students classification (regular, irreg, and returning).~~
* [ ] push notification
* [ ] caching (redis/ sql lite)
* [x] make it role based access.
* [x] add records management for the admin, logs,&#x20;
* [x] add ui for the meditrackocr
* [x] use the DentalExaminationReport for the dental
* [ ] validation for the name in which number shouldn't be able to be typed in to, the ID shouldn'g have character asside from "-" and numbers.&#x20;

Appointment:

* [x] ~~fix the approved appointment sections where its appearing collapsed even though it shouldn't be collapsed by default.~~
* [ ] make it so it also filter the appointment for dentist to only see appointments with dental related concerns
* [x] Canceled - Missed Penalty for spam booking

Appoinment-user:

* [x] ~~only one appointment at a time users cannot send multiple appointment until the active appointment is not yet finished.~~
* [x] fix the modal for the request appointment.
* [x] remove the calendar

Consultation & Consultation-users:

* [ ] add a notification indicator for new messages arriving
* [ ] add seen indicator for when the other party seened the message
* [x] ~~add a prompt asking users about their concern then it should  redirect to the conversation for dentist or doctors/nurses. the prompt is asking user about what type of help do they need. then based on what they choose. so make the consultation for admin-clinic to have 2 instance for doctors/ dentist. admin can see both instance of conversation.~~

Records:

* [x] ~~make the add records work, make it similar to signup but with no OCR and there should be temporary password given that they can change later on.~~

* [x] ~~add a filter for year level, section,~~

* [x] ~~display prev records of the patients (medical and dental)~~

* [x] ~~add filter for roles, year level and section. and ascending or decending order of reords.(the roles is not working properly) add filter for the program~~

Records-user:

* [x] display the medical and dental examinations summary                                                                                                                                                                                           &#x20;
* [x] display their medical certificate.
* [x] make the med cert be downloadable as pdf
* [x] add plsp logo in the medical certificate

Examinations:

* [x] the part of school year is still missing identify how can we set the general schoolyear for the system (maybe add a settings page for that where we can set the school year at the start of enrollment.)

* [x] ~~it will be a subcollection of users. medical examination and dental examination.~~

* [x] ~~make the examination saves in the database.~~

* [x] ~~make the examination saves in the database.~~

* [x] ~~make the dental examination saves in the database.~~

* [x] ~~connects with approvals page~~

* [x] ~~the vitals didnt save properly to the database.~~

* [x] ~~use the component DatePicker.jsx for the medical and dental file.~~

* [x] understand the dental history which files are included for the dental history.

Announcements:

* [x] ~~make this module better.~~
* [x] ~~the storage for the image is still unknown. ; firebase storage~~
* [x] change the layout of the cards square img the text is on the right side of the image

User-management:

* [x] make the table scrollable.
* [x] add a functionality to delete or edit users informations, but it should be archived.

Examination:

* [x] Add Time of examination

Approval:

* [x] add medical history (consultation log (name, purpose, doctor, date and time)

Profile-user:

* [ ] the uploading of health documents is not working
* [x] fix the edit modal for all the informations

Settings:

* [x] make the content scrollable

Meditrack:

* [x] the displaying of announcement.

  think of something to add to the home page.

For Future development:
\-

* [x] Add Record management for admin only in which we can see all the records in the systems and be able to delete records.

- [x] This will store all the previous records of students and employees and it should be deleted 4-5 years after graduation(for student) after no longer working (for employees)
- [ ] sqlite for offline capabilities.
-

Role Management

|                                     | admin                                       | doctor                               | dentist                              | nurse                                | student/employee/staffs             |
| :---------------------------------- | :------------------------------------------ | :----------------------------------- | :----------------------------------- | :----------------------------------- | :---------------------------------- |
| Dashboard                           |                                             |                                      |                                      |                                      | ❌                                   |
| User Management                     |                                             | ❌                                    | ❌                                    | ❌                                    | ❌                                   |
| Audit Logs                          |                                             | ❌                                    | ❌                                    | ❌                                    | ❌                                   |
| Ocr Settings                        |                                             | ❌                                    | ❌                                    | ❌                                    | ❌                                   |
| Record Management (All)             |                                             | ❌                                    | ❌                                    | ❌                                    | ❌                                   |
| Records                             | ❌                                           | (Medical Exams)                      | (Dental Exams)                       | (Medical Exams)                      | ❌                                   |
| Appointments / Queue                | ❌                                           |                                      |                                      |                                      | ❌                                   |
| Consultations / Triage              | ❌                                           |                                      |                                      |                                      | ❌                                   |
| Approvals (Clearances)              | ❌                                           |                                      | ❌                                    | ❌                                    | ❌                                   |
| Announcement                        | (Manage)                                    | (View Only)                          | (View Only)                          | (Manage)                             | ❌                                   |
| Home(Dashboard w/ Annoucements)     | ❌                                           | ❌                                    | ❌                                    | ❌                                    |                                     |
| Booking(appoinment request)         | ❌                                           | ❌                                    | ❌                                    | ❌                                    |                                     |
| Consultations / Triage              | ❌                                           | ❌                                    | ❌                                    | ❌                                    |                                     |
| Records(med x den history/ med crt) | ❌                                           | ❌                                    | ❌                                    | ❌                                    |                                     |
| Profile(user info                   | ❌                                           | ❌                                    | ❌                                    | ❌                                    |                                     |
| Reports and Analytics               |                                             | ❌                                    | ❌                                    | ❌                                    | ❌                                   |
| Settings                            | OCR Settings/Security/System Configurations | Notifications/Data & Privacy/General | Notifications/Data & Privacy/General | Notifications/Data & Privacy/General | General/Notifications/Support/About |

Accounts:

<dekbermas@gmail.com> admin\
[jamescantre@gmail.com](mailto:john.doe@example.com) doctor

<smcrm521@gmail.com> nurse\
<catherine@gmail.com> dentist

<ly.jxnny@gmail.com> student

password -1234567890

user

* [x] the profile setup. it should be middle name and age couldn't be negative number and should be realistic.&#x20;
* [ ] then make the consultation and appointment be only accessible if theres already a medical or dental record for that account.
* [ ] user homepage, the pending and approved booking should show
* [x] user profile should be marked as yellow if theres a empty or null information.
* [x] user records should have some type of filter to sort from latest to oldest or something.
* [ ] make sure the records-user is displaying the records proplery especailly the dental
* [x] user notifications
* [x] the profile-users. when i tried to edit a certain container it should only update that specific part of profile user not the complete page. because its currently saving the complete data so some fields becomes null since if i only edited the emergency contact the personal and academic information becomes null since when save changes is clicked all the payload includes everything, section it so that only the edited info is posted on the database.
* [x] for the empty info the container for that should be marked as yellow as warning indicating that it needs to be filled in.

dentist/doctor

* [x] records should be set as all department by default.&#x20;
* [x] add a search bar for the approved appointments.
* [x] fix the dental exam report.
* [x] the appointments isnt showing up in the calendar

admin

* [ ] logs should be deleted automatically during a certain period
* [x] reports should be downloadable by categories(each categories should have downloads button)
* [x] update the user management to be able to update users just like how its done in profile setup, some inputs should be dropdowns.
* [x] user names is not showing properly in the audit logs and
* [ ] &#x20;when admin edits the info it should show as well who updates the informations.
* [x] add archives
* [x] consultation management. he can oversees both dental and medical conversations.(he can delete the whole conversation)
* [x] make new file appointment management, consultations management and approval management, basically everything the system have should be manageable within the admin side UI.
* [ ] add new feature wherein the examination.jsx both dental and medical forms cna be edited. if in the future the medical form and dental form has been changed, admin can do that too. if the questions are changed, etc etc.

general:



* [ ] normalize the text for the name so it cant be capitalized or all lowercase.

* [x] the university id didn't saved properly.

* [x] merge the approvals and dental approval

* [x] for the clinical profile can it be more detailed displaying all the informations that each
  users have. the users table is this one C:\Users\HP\MediTrack\sql\users\_table.sql and for the
  visit history it should be a singular modal or container that displays all the details of
  their medical and dental history from the dental and medical records. so when the visit
  history is viewed by the clinic staff all they have to do is scroll down to see the records
  separated by tables. showing the most important data from each consultation.

* [x] for the address for personal information and emergency contact i want it to use
  the C:\Users\HP\MediTrack\frontend\src\components\AddressModal.jsx for picking
  address.

* [x] add a button for clinic staffs to choose the type of semester its on. use school calendar, 2025-2026 1st  sem, 2nd sem, or something like that.

* [ ] make sure to use school year for the dashboard,(with everything)

* [x] the exam date should be the same as "created at"

* [x] the program should be complete name, Bachealor of Science in.. for th profile user edit information profile user

* [ ] add suffix to medical and dental records

* [x] i want to make the archive function works, i have a database table for archives C:\Users\HP\MediTrack\sql\archives\_table.sql i want all the admin pages like : records, announcements, consultations, appointments, approvals, user management, they all have delete functionalities. i want to make it so that whenever use(admin) deletes anything it goes to archives first. make a .md file on what needs to be done phase by phase..... can we do it so that all tables have isArchived column, and whenever admin deletes its set to true but by default its false. then the archive function still be the same where in it saved the item into the archives table. so when archive is toggle all the page will just show the isArchived == false meaning admin cna only see all the deleted(archived file) in the archives page and all the not deleted items will be shown in other pages such as appointments, approvals, users management etc..

* [ ] archive : add functionality for all the tables to saved the name of the deleted\_by just like the medical and dental

* [ ] for the audit logs i want to have atleast 1 week retention for the logs before it get sent to the archive and then after another 1 week it gets permanently deleted.

* [x] make the tooth condition shows, from the tooth data from the database.

* [x] remove the Previous Dental Visit, Dental Procedures Done, Patient Signature from the Dental Examination Details.&#x20;

* [x] just like the medical examination details, add "Past Dental Records" for the Dental Examination Details.

* [x] the university id should be visible to the consultation page as well next or under the name of the user.

* [x] the id and program is not visible in the appointment management in admin side

* [ ] the settings page is not functional yet

* [x] remove the settings and sign out in the profile-users

* [ ] nurse, dentist and doctors license number should be set in the profile drawer in header. so i need to update the database to store the lincese no.

* [x] for the appointments in user side once they clicked the appointment schedule it should show like a card modal that pops out wherein the information of the appointment is easily visible. so that they can easily see those appointment schedule.

* [ ] for the appointments i want it so when a pending appointments is selected you cannot select date that have passed already, but if theres no pending appointment selected i can click any dates even though it already passed. and make the date that have already passed looked faded but not too much just subtle fade to differentiate the dates easily

* [ ] In Records.jsx the Create New User & Profile the role is not entirely accurate. it should be admin, nurse, doctor, dentist, student, employee,

* [x] once a consultation thread is opened there should be a button to go back to the empty state or to close the consultation thread

* [ ] make it so that whenever admin creates an announcment it creates a notification.

* [ ] for the announcements whenever the announcement targets a specific department all users under that department should receive a notification for it.

* [ ] admin can view that records informations in records management for admin.

* [ ]  for the C:\Users\HP\MediTrack\frontend\src\features\users\HomePage-users.jsx the part wherein the upcomming appointment should be displayed it should display the if theres an appointment for that specific
  user that is approved. else it should stays as no upcoming appoinment.

* [x] homepage-user it should only display the announcements that arent on archive (is\_archived == False) only.



***

###### 07/10/26



* [ ] forgot password
* [ ] make it so that whenever admin creates an announcment it creates a notification.
* [ ] for the announcements whenever the announcement targets a specific department all users under that department should receive a notification for it.
* [ ] admin can view that records informations in records management for admin.
* [ ]  for the C:\Users\HP\MediTrack\frontend\src\features\users\HomePage-users.jsx the part wherein the upcomming appointment should be displayed it should display the if theres an appointment for that specific
  user that is approved. else it should stays as no upcoming appoinment.
* [ ] for the appointments i want it so when a pending appointments is selected you cannot select date that have passed already, but if theres no pending appointment selected i can click any dates even though it already passed. and make the date that have already passed looked faded but not too much just subtle fade to differentiate the dates easily
* [ ] In Records.jsx the Create New User & Profile the role is not entirely accurate. it should be admin, nurse, doctor, dentist, student, employee,
* [ ] the settings page is not functional yet
* [ ] archive : add functionality for all the tables to saved the name of the deleted\_by just like the medical and dental
* [ ] for the audit logs i want to have atleast 1 week retention for the logs before it get sent to the archive and then after another 1 week it gets permanently deleted.
* [ ] make sure to use school year for the dashboard,(with everything)
* [ ] add suffix to medical and dental records
* [ ] normalize the text for the name so it cant be capitalized or all lowercase.
* [ ] when admin edits the info it should show as well who updates the informations.
* [ ] make sure the records-user is displaying the records proplery especailly the dental
* [ ] then make the consultation and appointment be only accessible if theres already a medical or dental record for that account.
* [ ] user homepage, the pending and approved booking should show
* [ ] sqlite for offline capabilities.
* [ ] the uploading of health documents is not working
* [ ] add a notification indicator for new messages arriving
* [ ] add seen indicator for when the other party seened the message
* [ ] make it so it also filter the appointment for dentist to only see appointments with dental related concerns
* [ ] caching (redis/ sql lite)



