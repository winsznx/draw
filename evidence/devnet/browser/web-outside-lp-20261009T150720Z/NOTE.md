Context, not a verdict. On 2026-10-09 a person outside the DRAW team took the LP seat on https://drawcalls.xyz in her own browser, on her own computer. She is another participant on the AppsFactory hackathon platform who isn't submitting this project or working on it. She agreed to be mentioned and quoted, and the docs describe her by role only.

Who did what:

- The LP side was done by her, following a written guide. She joined this demo fund by setting its tour id (`draw-tour`) in her browser, signed in with HackCanton as xidoncapitals-t1, a login NODERS created for the DRAW team on 2026-10-07, joined as an LP, accepted her commitment, paid 4 CC from that login's Canton wallet from DRAW, and saw her notice turn verified funded.
- The fund manager side was run by the team with a script, which wrote `steps.json` and the screenshots here as it went: it created the demo fund, issued the call, saw her payment locked, and settled it. The read-back confirmed the settlement before the notice counted as funded.

What is recorded how:

- `steps.json` and the numbered screenshots were written by the script, on the fund manager's side only.
- The LP's steps aren't script-written. They come from screenshots she sent in a chat with the owner and from the owner's notes. In UTC: she joined the fund at about 15:38, sent a screenshot of her notice with 4 CC locked for the fund at about 19:08, and a screenshot of it verified funded at about 19:15. The gap between joining and paying was waiting on each other, not the app.
- The second entry in `steps.json`, marked not ok, says the call form listed no HackCanton LP. That guess at the cause was wrong: she had already joined and accepted. The script looked for the form's field before the form had loaded. Issued again three minutes later straight from the form's address, the call went through.
- The call also had a line for demo seat LP A, $400,000 as 40 CC, which the form fills in by default. LP A never paid, so it stayed unresolved.

Her answers, verbatim:

1. Ease: "Somewhat easy"
2. Where she was confused: "I initially entered the LP A demo seat instead of signing in"
3. "Yes, you may mention that I tested DRAW and you may also quote my feedback."

Limits: one session, one person. The login she used was created for the team, so this separates the person, not the account. She used DRAW's Pay button, not the Canton Coin wallet's Accept. The fund manager seat still signs through DRAW's backend client.
