-- Dev seed: fake approved papers (file_path points to nothing; UI dev only)
insert into public.papers (course_code, course_name, year, exam, semester, file_path, approve_status, from_library)
values
 ('CS10001','Programming and Data Structures',2023,'endsem','odd','approved/seed/cs10001_2023_es.pdf',true,true),
 ('CS10001','Programming and Data Structures',2023,'midsem','odd','approved/seed/cs10001_2023_ms.pdf',true,true),
 ('MA11003','Linear Algebra',2022,'endsem','even','approved/seed/ma11003_2022_es.pdf',true,true),
 ('PH10001','Physics of Waves',2024,'ct1','even','approved/seed/ph10001_2024_ct1.pdf',true,true),
 ('EE20002','Digital Electronics',2024,'midsem','odd','approved/seed/unapproved_example.pdf',false,false);
