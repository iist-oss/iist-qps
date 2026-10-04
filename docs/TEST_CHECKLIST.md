# Test checklist (run on the live site after a release; takes about 10 minutes)
Tick what you tried; paste anything that fails to the AI.

## Anyone (signed out)
- [ ] Home shows a paper and course count above 0
- [ ] Search "calculus", "MA111C", "ma111" (typo/short), "lab": results appear
- [ ] Filters Midsem / Endsem / Class test / Lab / Assignment change the results
- [ ] Open PDF works; Copy link works; Share results copies the page link
- [ ] Footer links open About, About the builder, Takedown & privacy; the email link opens a mail app
- [ ] An unknown address like `/iist-qps/xyz` goes back to the site (404 page)

## Sign in
- [ ] A @iist.ac.in and a @ug.iist.ac.in address both get a code by email; the code works
- [ ] A Gmail address is refused with a clear message (no email sent)

## Upload (student)
- [ ] A text PDF: code, year, exam, semester fill in by themselves
- [ ] A scanned PDF: fills in after a short wait (OCR); fields can be corrected
- [ ] 11 files at once: only 10 are added, with a message
- [ ] A 48 MB PDF and a renamed non-PDF are refused with a friendly message
- [ ] An admin email arrives for the first upload of a batch

## Admin
- [ ] Review queue lists the upload; the PDF preview opens; the course name is pre-filled
- [ ] Approve works and the paper appears in search; Save only keeps it pending
- [ ] A second copy of the same paper shows a "possible duplicate" box; "Exercise 1" vs "Exercise 2" do not
- [ ] Delete shows Undo for 8 seconds; Trash > Restore and Delete permanently work
- [ ] Courses tab: paste two lines, preview is right, Save adds them; Remove works
- [ ] Header badge shows the pending number and drops after approving

## Mobile (phone browser)
- [ ] No sideways scrolling on Search, Upload, Admin
- [ ] Buttons are easy to tap; the keyboard does not hide the field you are typing in
