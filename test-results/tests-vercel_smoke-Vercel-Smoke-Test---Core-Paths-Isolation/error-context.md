# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\vercel_smoke.spec.ts >> Vercel Smoke Test - Core Paths & Isolation
- Location: tests\vercel_smoke.spec.ts:5:5

# Error details

```
Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: Create an account
      - generic [ref=e7]: Enter your information to get started with SYNCORA
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: Full Name
        - textbox "Full Name" [ref=e12]:
          - /placeholder: Ibrahim Shareef
          - text: Vercel QA Tester
      - generic [ref=e13]:
        - generic [ref=e14]: Email
        - textbox "Email" [ref=e15]:
          - /placeholder: name@example.com
          - text: qa-vercel-1790059082350@example.com
      - generic [ref=e16]:
        - generic [ref=e17]: Password
        - generic [ref=e18]:
          - generic [ref=e19]:
            - textbox "Password" [ref=e20]:
              - /placeholder: Create a secure password
              - text: Password123!
            - button "Show password" [ref=e21]
          - generic [ref=e26]:
            - generic [ref=e27]: Strong
            - list [ref=e31]:
              - listitem [ref=e32]:
                - generic [ref=e35]: At least 8 characters
              - listitem [ref=e36]:
                - generic [ref=e39]: Contains a number
              - listitem [ref=e40]:
                - generic [ref=e43]: Contains uppercase letter
              - listitem [ref=e44]:
                - generic [ref=e47]: Contains special character
      - button "Sign Up" [ref=e48]
    - generic [ref=e50]:
      - text: Already have an account?
      - link "Sign in" [ref=e51] [cursor=pointer]:
        - /url: /login
  - region "Notifications alt+T"
  - alert [ref=e52]
```