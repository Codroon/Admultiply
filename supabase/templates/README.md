# Supabase auth email templates

`auth-code.html` is the email a customer gets when they sign in. It carries a
six digit code and nothing else.

## Where it goes

Supabase dashboard, Authentication, Email Templates. Paste the same file into
**both** of these:

- **Magic Link**, sent to an address Supabase already knows
- **Confirm signup**, sent to a brand new address

Supabase picks between them based on the recipient, so doing only one leaves
either your existing customers or all your new ones unable to get in.

Subject line for both, pasted exactly:

```
{{ .Token }} is your AdMultiply code
```

The code in the subject is deliberate. It shows in the phone notification, so
most people never open the email at all.

## Why there is no link in it

The link and the code are the same single use token. Gmail and corporate mail
scanners open links to check them for phishing, and that spends the token
before the customer can type it, which makes a good code come back as
"expired". Taking the link out is the fix.

That is also why the comment at the top of the HTML writes `ConfirmationURL`
without its braces. Supabase substitutes variables inside HTML comments too,
so writing it in full would put a live link back into the source of the email.

## Why there is no logo image

Most email clients block remote images by default, so a hosted logo is a
broken box more often than it is a logo. The wordmark is set in type instead.

## Sending

These go out through Resend over custom SMTP. Supabase's built in sender is
capped at 2 emails an hour for the whole project, which is not a working
limit for anything but a single developer testing alone.
