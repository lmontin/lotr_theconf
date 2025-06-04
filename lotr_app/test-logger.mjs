import { detailedLogger, logUI, logMovement, logBattle, logAbility } from '../src/lib/utils/detailedLogger';

// Test the logging system
console.log('=== Testing Detailed Logger ===');

logUI('test', 'testFunction', 'Testing UI logging', { testData: 'ui test' });
logMovement('test', 'testFunction', 'Testing Movement logging', { testData: 'movement test' });
logBattle('test', 'testFunction', 'Testing Battle logging', { testData: 'battle test' });
logAbility('test', 'testFunction', 'Testing Ability logging', { testData: 'ability test' });

console.log('Logger test completed. Check the console for colored output.');
console.log('Logs captured:', detailedLogger.getLogs().length);

// Export the logs to see the structure
console.log('Sample log structure:', JSON.stringify(detailedLogger.getLogs()[0], null, 2));
