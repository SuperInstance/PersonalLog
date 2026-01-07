# Hello World Plugin

A simple "Hello World" plugin demonstrating the basics of PersonalLog plugin development.

## Features

- Customizable greeting message
- UI component displaying greeting
- Command to send greeting
- Message tracking
- Settings management
- Usage statistics

## Installation

1. Copy plugin to your PersonalLog plugins directory
2. Enable plugin in settings
3. Customize greeting in plugin settings

## Usage

### View Greeting

The greeting displays in the header when the plugin is active.

### Send Greeting Command

Use the command palette (Ctrl/Cmd + Shift + P) and select "Say Hello" to send a greeting.

### Customize Settings

Go to plugin settings to:
- Change the greeting message
- Toggle timestamp display

## API Usage

```typescript
// Get current greeting
const greeting = await getGreeting(context);

// Set new greeting
await setGreeting(context, 'Bonjour!');

// Get statistics
const stats = await getGreetingStats(context);
console.log(`Greetings sent: ${stats.count}`);

// Reset statistics
await resetGreetingStats(context);
```

## Development

Built with TypeScript and the PersonalLog Plugin SDK.

## License

MIT

## Author

PersonalLog Team
