import React, { useEffect } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  BleSensors,
  PowerMeter,
  HeartRateMonitor,
} from 'react-native-cycling-sensors';

const App = () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleDiscoverPeripheral = (peripheral: any) => {
    console.log(peripheral);
  };

  const handlePowerData = (data: any) => {
    console.log('Power: ', data);
  };

  const handleHrmData = (data: any) => {
    console.log('HRM :', data);
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
      const pm = new PowerMeter(sensorList.CyclingPower[0]?.id);

      const hrm = new HeartRateMonitor(sensorList.HeartRate[0]?.id);
      await pm.connect().catch((err) => handleError(err));

      await hrm.connect().catch((err) => handleError(err));
      pm.subscribe(handlePowerData);

      hrm.subscribe(handleHrmData);
      await sleep(5000);
      await pm.getSensorLocation().catch((err) => handleError(err));
      await sleep(5000);
      await pm.disconnect().catch((err) => handleError(err));
      await hrm.disconnect().catch((err) => handleError(err));
    };

    startBleSensors(); // run it, run it

    return () => {
      // this now gets called when the component unmounts
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Text>Testing...</Text>
        <Button title={'Scan Bluetooth'} onPress={handleButton} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  title: {
    textAlign: 'center',
    marginVertical: 8,
  },
  fixToText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  separator: {
    marginVertical: 8,
    borderBottomColor: '#737373',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default App;
