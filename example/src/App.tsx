import React, { useEffect } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { BleSensors, HeartRateMonitor } from 'react-native-cycling-sensors';

const App = () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleDiscoverPeripheral = (peripheral: any) => {
    console.log(peripheral);
  };

  const handleHrData = (data: any) => {
    console.log('Heart Rate: ', data);
  };

  const handleScanStop = () => {
    console.log('Scanning Stopped');
  };

  const handleButton = () => {
    console.log('button pressed');
  };

  const handleError = (error: Error) => {
    console.log('Got error: ', error);
  };

  useEffect(() => {
    const startBleSensors = async () => {
      // Setup bleSensors instance and start it
      const bleSensors = new BleSensors();
      await bleSensors.requestPermissions();
      await bleSensors.start();

      // Do some scanning for devices.
      await bleSensors.startSensorDiscovery();
      let sensorDiscoverySub = bleSensors.subscribeToDiscovery(
        handleDiscoverPeripheral
      );
      let sensorDiscoveryStopSub =
        bleSensors.subscribeToDiscoveryStop(handleScanStop);
      await sleep(5000);
      const sensorList = await bleSensors.getDiscoveredSensors();
      console.log(sensorList);
      await bleSensors.stopSensorDiscovery();
      sensorDiscoverySub.remove();
      sensorDiscoveryStopSub.remove();

      // Now lets connect to a specific heart rate monitor
      const hrm = new HeartRateMonitor();
      hrm.address = 'F0:99:19:59:B4:00';

      try {
        await hrm.connect();
        hrm.subscribe(handleHrData);
      } catch (error) {
        console.log(error);
        hrm.disconnect();
      }
      await sleep(2000);
      const isConnected = await hrm
        .isConnected()
        .catch((err) => handleError(err));
      console.log('HRM isConnected = ', isConnected);
      await sleep(5000);
      await hrm.stopNotification(hrm._address).catch((err) => handleError(err));
      await sleep(5000);
      await hrm.disconnect().catch((err) => handleError(err));
      const isConnectedAfter = await hrm
        .isConnected()
        .catch((err) => handleError(err));
      console.log('HRM isConnected = ', isConnectedAfter);
    };
    // };

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
