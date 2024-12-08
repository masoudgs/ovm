# Configuration

The config file is created in the user's home directory by [`ovm ci`](#ovm-config-init) and is named `ovm.json`. It contains an array of plugins that are to be installed across single/multiple vault.

```json
{
  "plugins": []
}
```

Example config file for following [Commands](#commands) section is as follows:

```json
{
  "plugins": [
    {
      "id": "colored-tags",
      "version": "latest"
    },
    {
      "id": "copilot",
      "version": "latest"
    },
    {
      "id": "dataview",
      "version": "latest"
    }
  ]
}
```
