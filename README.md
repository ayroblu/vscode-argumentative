# argumentative

Adds the `argumentative.shiftLeft` and `argumentative.shiftRight` commands

I saw there was one implementation in the store and it was not working for me (it didn't keep arguments where they were, instead always running a join)

I wanted to map `<` + `,` but this didn't work for me (I guess vim vscode is a little buggy on this so I mapped `<leader>` + `,` and `<leader>` + `.` like:

```json
({
  "before": ["<leader>", ","],
  "after": [],
  "commands": [
    {
      "command": "argumentative.shiftArgLeft"
    }
  ]
},
{
  "before": ["<leader>", "."],
  "after": [],
  "commands": [
    {
      "command": "argumentative.shiftArgRight"
    }
  ]
})
```
