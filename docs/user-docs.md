# User Documentation

Welcome to the MRF MVT (Metadata Verification Tool), this tool helps you to access the metadata for experiments and push data from the export server to where it will live.

## Logging in and Getting around

Log in using your KeyCloak log in, if you are unsure what this is please contact MRF admins.

### Landing Page
[Screen shot of landing page]

Here you will find the overall statistics of what bookings are in the system.

### Bookings Tab

[Screen shot of navigating to bookings]

If you click on the bookings tab you will see a list of bookings where you are down as the Scientific Support.

### Individual Booking

[Screen shot of booking]

To access a booking you can click on one of the instances in the Bookings tab. This will open the metadata for that booking and is where you will process the data and metadata for it.

## Phase 1: Pre-Experiment Initialisation

### Select Your Booking
Before starting the process here you need to have submit a booking request in the MRF booking system. 

The booking will show up here in the Bookings tab when you log in. If you do not see a booking you believe should be present click the `sync` button. If it is still not present contact the MRF admins to ensure that fields have been filled out correctly in the MRF Booking System.

### Verify Your Metadata

Check the metadata fields of the booking to ensure they are correct. If you see any issues please contact MRF admins to edit the Booking System and then refresh. Most important are the fields `jobId`, `seId`, and `sessionId` as these will determine the directories where your data will live.

### Create Your Directories

Once you are happy with the metadata, click Submit and the system will create directories on your export server. You are now ready to run the experiment.


## Phase 2: During the Experiment

Conduct your experiment as usual.

Once your data is ready to export, manually drag it into the `sessionId` folder in the folder structure created in the export server. You should see a file system like this `jobId`/`seId`/`sessionId`.

## Phase 3: Post-Experiment and Securing your Data

Re-open your booking from the Bookings tab. You can now add any subsequent metadata or check if appropriate fields have changed from the booking system.

### Final Submission

Now you will click Send Metadata which will send your metadata to SciCat. And, Submit Data, this will start the data transfer from the export server to PowerScale (the end data location)

[Screen shot of buttons to send data and metadata]

## Phase 4: Finding your Data Later

After you "Send" the booking it will disappear from the MVT dashboard. You can then download your data directly through the SciCat UI (add link here).

[Screen shot of SciCat here]

## FAQs

Write up questions from users in demo/first stage of deployment.
Write up explanation on fields in the UI.