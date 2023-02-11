# react-native-cycling-sensors

A RN package for BLE cycling sensors.

Currently only supports:
- Heart Rate
- Cycling Power Measurement
- Cycling Power Vector
- Cycling Speed and Cadence

Tested with Garmin Forerunner 945 (HR broadcast), Garmin HRM Pro for Heart Rate and Tacx Neo 2T and Favero Assioma duo for Power and Cadence measurements.

## Installation

```sh
npm install react-native-cycling-sensors
```

## Usage

```js
import React, { useEffect } from 'react';
import { Button, SafeAreaView, Text, View } from 'react-native';
import { BleSensors, PowerMeter } from 'react-native-cycling-sensors';

const App = () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleDiscoverPeripheral = (peripheral: any) => {
    console.log(peripheral);
  };

  const handlePowerData = (data: any) => {
    console.log('Power: ', data);
  };

  const handleButton = () => {
    console.log('button pressed');
  };

  const handleError = (error: Error) => {
    console.log('Got error: ', error);
  };

  useEffect(() => {
    const startBleSensors = async () => {
      const bleSensor = new BleSensors();
      await bleSensor.requestPermissions();
      await bleSensor.start();
      await bleSensor.startSensorDiscovery();
      bleSensor.subscribeToDiscovery(handleDiscoverPeripheral);
      await sleep(10000);
      const sensorList = await bleSensor.getDiscoveredSensors();
      console.log(sensorList);
      if (sensorList.CyclingPower[0]) {
        const pm = new PowerMeter(sensorList.CyclingPower[0].id);
        await pm.connect().catch((err) => handleError(err));
        pm.subscribe(handlePowerData);
        await sleep(5000);
        await pm.getSensorLocation().catch((err) => handleError(err));
        await sleep(5000);
        await pm.disconnect().catch((err) => handleError(err));
      }
    };

    startBleSensors(); // run it, run it

    return () => {
      // this now gets called when the component unmounts
    };
  }, []);

  return (
    <SafeAreaView>
      <View>
        <Text>Testing...</Text>
        <Button title={'Scan Bluetooth'} onPress={handleButton} />
      </View>
    </SafeAreaView>
  );
};
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
