\[TODO]

* forgot password
* add a notification for the whole system in the header.put it next to the profile
* **~~fix the profile setup to upload all the content into the database some contents are not uploading properly~~**
* **~~fix the dashboard.jsx to fill the whole screen.~~**
* **~~add aditional information in the profile setup. : Dose(1st, 2nd 3rd, booster1, booster2), Name of Vaccine, Date; emergency contact: relationship and address; for users: Home address, Religion, Nationality, Civil status~~**
* **~~make the examinations and approvals page work.~~**
* fix the color mismatch of the logo.
* Connect the dashboard to the database.
* **~~understand how to make sure that the records gets saved in the database and when another examination happened the old records becomes a read only and cannot be edited.~~**
* **~~add students classification (regular, irreg, and returning).~~**

Appointment:

* **~~fix the approved appointment sections where its appearing collapsed even though it shouldn't be collapsed by default.~~**
* add email notification for when an appointment gets approved stating the time and date of the appointment.

Appoinment-user:

* **~~only one appointment at a time users cannot send multiple appointment until the active appointment is not yet finished.~~**

Consultation & Consultation-users:

* add a notification indicator for new messages arriving
* add seen indicator for when the other party seened the message.

Records:

* make the add records work, make it similar to signup but with no OCR and there should be temporary password given that they can change later on.
* **~~add a filter for year level, section,~~**
* **~~display prev records of the patients (medical and dental)~~**
* add filter for roles, year level and section. and ascending or decending order of reords.(the roles is not working properly)
* make the previous records of patients be a modal?

Records-user:

* **~~display the medical and dental examinations summary~~**&#x20;
* **~~display their medical certificate.~~**
* **~~make the med cert be downloadable as pdf~~**
* **~~add plsp logo in the medical certificate~~**

Examinations:

* the part of school year is still missing identify how can we set the general schoolyear for the system.
* (maybe add a settings page for that where we can set the school year at the start of enrollment.)
* **~~it will be a subcollection of users. medical examination and dental examination.~~**
* **~~make the examination saves in the database.~~**
* **~~make the dental examination saves in the database.~~**
* **~~connects with approvals page~~**
* **~~the vitals didnt save properly to the database.~~**
* use the component DatePicker.jsx for the medical and dental file.

Announcements:

* make this module better.
* the storage for the image is still unknown.

User-management:

* add a functionality to delete or edit users informations, but it should be archived.
* ~~make the table scrollable.~~

For Future development:
-Add Record management for admin only in which we can see all the records in the systems and be able to delete records.

* This will store all the previous records of students and employees and it should be deleted 4-5 years after graduation(for student) after no longer working (for employees)
* Possible "settings" page.
* sqlite for offline capabilities.

