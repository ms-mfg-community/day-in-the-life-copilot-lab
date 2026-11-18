---
title: Fixture whose declared keys carry the wrong kind of value
minutes: "35"
anchor_labs: lab01
pace:
  presenter_minutes: 5
---

`minutes` is a string, `anchor_labs` is a string instead of a list, and `pace` lacks
`self_paced_minutes`. Every key is declared, so only the value checks can reject this file.
