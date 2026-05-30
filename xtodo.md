\[TODO]

* [ ] forgot password
* [ ] add a notification for the whole system in the header.put it next to the profil
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

Signup:

* [ ] Validation by clinic staff

Appointment:

* [x] ~~fix the approved appointment sections where its appearing collapsed even though it shouldn't be collapsed by default.~~
* [ ] add email notification for when an appointment gets approved stating the time and date of the appointment.
* [ ] make it so it also filter the appointment for dentist to only see appointments with dental related concerns
* [ ] Canceled - Missed Penalty for spam booking

Appoinment-user:

* [x] ~~only one appointment at a time users cannot send multiple appointment until the active appointment is not yet finished.~~
* [ ] fix the modal for the request appointment.
* [x] remove the calendar

Consultation & Consultation-users:

* [ ] add a notification indicator for new messages arriving
* [ ] add seen indicator for when the other party seened the message
* [x] ~~add a prompt asking users about their concern then it should  redirect to the conversation for dentist or doctors/nurses. the prompt is asking user about what type of help do they need. then based on what they choose. so make the consultation for admin-clinic to have 2 instance for doctors/ dentist. admin can see both instance of conversation.~~

Records:

* [x] ~~make the add records work, make it similar to signup but with no OCR and there should be temporary password given that they can change later on.~~
* [ ] when adding new record it should email into the email of the student,&#x20;
* [x] ~~add a filter for year level, section,~~
* [x] ~~display prev records of the patients (medical and dental)~~
* [x] ~~add filter for roles, year level and section. and ascending or decending order of reords.(the roles is not working properly) add filter for the program~~

Records-user:

* [x] display the medical and dental examinations summary                                                                                                                                                                                            &#x20;
* [ ] settings page idea: the settings page should include a input for  the admin to set the current School year
* [x] display their medical certificate.
* [x] make the med cert be downloadable as pdf
* [x] add plsp logo in the medical certificate

Examinations:

* [ ] the part of school year is still missing identify how can we set the general schoolyear for the system (maybe add a settings page for that where we can set the school year at the start of enrollment.)

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
* [ ] add a functionality to delete or edit users informations, but it should be archived.

Examination:

* [ ] Add Time of examination

Approval:

* [ ] add medical history (consultation log (name, purpose, doctor, date and time)

Profile-user:

* [ ] the uploading of health documents is not working
* [ ] fix the edit modal for all the informations

Settings:

* [x] make the content scrollable

Meditrack:

* [x] the displaying of announcement.
* [ ] think of something to add to the home page.

For Future development:
\-

* [ ] Add Record management for admin only in which we can see all the records in the systems and be able to delete records.

- [ ] This will store all the previous records of students and employees and it should be deleted 4-5 years after graduation(for student) after no longer working (for employees)
- [ ] Possible "settings" page.
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
<john.doe@example.com> doctor

<smcrm521@gmail.com> nurse\
<catherine@gmail.com> dentist

<ly.jxnny@gmail.com> student

password -1234567890
