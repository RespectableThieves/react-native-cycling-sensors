import React, { useEffect, useState } from 'react'
import { Button, EmitterSubscription, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { BleSensors, PowerMeter, CadenceMeter, HeartRateMonitor } from 'react-native-cycling-sensors'

const App = () => {
  const [isScanning, setIsScanning] = useState(false); 
  
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const handleDiscoverPeripheral = (peripheral: any) => {
    // console.log(peripheral);
  }

  const handlePowerData = (data: any) => {
    console.log('Power: ', data)
  }

  const handleCscData = (data: any) => {
    console.log('CSC: ', data)
  }

  const handleHrmData = (data: any) => {
    console.log('HRM :', data)
  }

  const handleButton = () => {
    console.log("button pressed");
  }

  useEffect(() => {

    const startBleSensors = async () => {
      const bleSensor = new BleSensors()
      await bleSensor.requestPermissions()
      await bleSensor.start()
      await bleSensor.startSensorDiscovery()
      await bleSensor.subscribeToDiscovery(handleDiscoverPeripheral)
      await sleep(10000)
      const sensorList = await bleSensor.getDiscoveredSensors()
      console.log(sensorList)
      // const pm = new PowerMeter(sensorList.CyclingPower[0]?.id)
      // const csc = new CadenceMeter(sensorList.CyclingSpeedAndCadence[0]?.id)
      const hrm = new HeartRateMonitor(sensorList.HeartRate[0]?.id)
      //await pm.connect()
      //await csc.connect()
      await hrm.connect()
      //await pm.subscribe(handlePowerData)
      //await csc.subscribe(handleCscData)
      await hrm.subscribe(handleHrmData)
      await sleep(5000)
      //await pm.disconnect()
      //await csc.disconnect()
      await hrm.disconnect()
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
        <Button 
                title={'Scan Bluetooth (' + (isScanning ? 'on' : 'off') + ')'}
                onPress={ handleButton } 
              />  
      </View>
    </SafeAreaView> 
  );
}



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
