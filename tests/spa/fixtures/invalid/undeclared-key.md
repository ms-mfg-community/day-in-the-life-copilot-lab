---
title: Fixture with an undeclared front-matter key
minutes: 10
undeclared_key_for_fixture: this key is in no curriculum file and is not declared by the schema
---

This file exists so that `npm run spa:validate` has an undeclared front-matter key to reject.
It is invalid for that one reason only: `title` and `minutes` are declared keys with valid values.
