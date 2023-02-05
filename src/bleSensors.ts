import {
    Platform,
    NativeModules,
    NativeEventEmitter,
    EmitterSubscription,
    PermissionsAndroid
} from 'react-native';

import BleManager, { Peripheral } from 'react-native-ble-manager';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

import { EventEmitter  } from 'eventemitter3';

// BLE service UUIDs we are interested in:
// Heart Rate service = 180D
// Battery Service = 180F
// Cycling Power service = 1818
// Running Speed and Cadence service = 1814
// Cycling Speed and Cadence service = 1816
// Device Information service = 180A
// Sensor Location = 2a5d
enum SupportedBleServices {
Battery = '180f',
HeartRate = '180d',
CyclingPower = '1818',
CyclingSpeedAndCadence = '1816',
RunningSpeedAndCadence = '1814',
SensorLocation = '2a5d'
}

type SensorList = {
    CyclingPower: Peripheral[],
    CyclingSpeedAndCadence: Peripheral[],
    HeartRate: Peripheral[]
}

class BleSensors {
    serviceUUIDs: string[] = [];

    constructor(serviceUUIDs: string[] = Object.values(SupportedBleServices)) {
        this.serviceUUIDs = serviceUUIDs
    }

    checkState(): void {
        BleManager.checkState();
    }

    enableBluetooth() : Promise<boolean> {
        return new Promise((resolve, reject) => {
            BleManager.enableBluetooth()
        .then(() => {
          console.log('The bluetooh is already enabled or the user confirm');
                resolve(true)
        })
        .catch((err: Error) => {
          console.log('The user refused to enable bluetooth: '+ err);
                reject(err)
        });
        });
    }

    requestPermissions(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (Platform.OS === 'android' && Platform.Version >= 23) {
                PermissionsAndroid.requestMultiple(
                  [ 
                  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                  PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                  PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                  PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
                  ).then((result) => {
                    if (result['android.permission.ACCESS_FINE_LOCATION']
                    && result['android.permission.ACCESS_COARSE_LOCATION']
                    && result['android.permission.BLUETOOTH_SCAN']
                    && result['android.permission.BLUETOOTH_CONNECT'] === 'granted') {
                      resolve(true);
                      console.log("Permissions already granted")
                    } else {
                      PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
                      ]).then((result) =>{
                        if (result) {
                          console.log("User accept");
                          resolve(true)
                        } else {
                          console.log("User refuse");
                          reject(false)
                        }
                      });
                    }
                  });
              }
        });
    }

    start() : Promise<boolean> {
        return new Promise((resolve, reject) => {
            BleManager.start({showAlert: false})
            .then( ()=>{
                this.checkState();
                console.log('BleManager successfully started'); 
                resolve(true)               
            }).catch(err=>{
                console.log('BleManager failed to start: '+ err);
                reject(err)
            });
        });
    }

    startSensorDiscovery(scanTime: number = 5)  {
        // We only scan for the devices with serviceUUIDs we support.
        return new Promise((resolve, reject) => {
            BleManager.scan(this.serviceUUIDs, scanTime, true)
                .then( () => {
                    console.log('Scan started');
                    resolve(true);
                }).catch( (err: Error)=>{
                  console.log('Scan started fail');
                  reject(err);
              });
        });
    }

    stopSensorDiscovery() : Promise<boolean> {
        return new Promise((resolve, reject) => {
            BleManager.stopScan()
            .then(() => {
                console.log('Scan stopped');
                resolve(true)
            }).catch((err: Error)=>{
              console.log('Scan stopped fail',err);
                reject(err)
          });
        });
    }

    subscribeToDiscovery(func: any ) : EmitterSubscription{
        return bleManagerEmitter.addListener('BleManagerDiscoverPeripheral',func);
    }

    getDiscoveredSensors() : Promise<SensorList> {
        return new Promise( (resolve, reject) =>{
            BleManager.getDiscoveredPeripherals()
                .then((peripheralsArray: Peripheral[]) => {
                    console.log('Discovered peripherals: ', peripheralsArray);
                    let list: SensorList ={
                        CyclingPower: [],
                        CyclingSpeedAndCadence: [],
                        HeartRate: []
                    }
                    peripheralsArray.forEach((device) => {
                        if(device.advertising.serviceUUIDs) {
                            console.log("serviceUUIDs = ", device.advertising.serviceUUIDs)
                            if( device.advertising.serviceUUIDs.includes(SupportedBleServices.CyclingPower) ) {
                                console.log("found power meter!")
                                list.CyclingPower.push(device)
                            } 
                            if( device.advertising.serviceUUIDs.includes(SupportedBleServices.CyclingSpeedAndCadence) ) {
                                list.CyclingSpeedAndCadence.push(device)
                            } 
                            if( device.advertising.serviceUUIDs.includes(SupportedBleServices.HeartRate) ) {
                                list.HeartRate.push(device)
                            }
                        }
                        
                    })
                    resolve(list);
                })
                .catch((err: Error) => {
                    console.log('Error getting discovered peripherals: '+ err)
                    reject(err)
                });
        });
    }

}

enum CyclingPowerCharacteristics {
    CyclingPowerMeasurement = '00002a63-0000-1000-8000-00805f9b34fb',
    CyclingPowerFeature = '00002a65-0000-1000-8000-00805f9b34fb',
    CyclingPowerVector = '00002a64-0000-1000-8000-00805f9b34fb',
    CyclingPowerControlPoint = '00002a66-0000-1000-8000-00805f9b34fb'
}

type CSCMeasurement = {
    cumulativeWheelRevs: number | null,
    lastWheelEventTime: number | null,
    cumulativeCrankRevs: number | null,
    lastCrankEventTime: number | null
  }
  
type CSCFeature = {
    wheelRevSupported: boolean,
    crankRevSupported: boolean,
    multipleLocationsSupported: boolean
  }

type CyclingPowerMeasurement = {
    instantaneous_power: number;
    pedal_power_balance: number | null;
    accumulated_torque: number | null;
    cumulative_wheel_revs: number | null;
    last_wheel_event_time: number | null;
    cumulative_crank_revs: number | null;
    last_crank_event_time: number | null;
    maximum_force_magnitude: number | null;
    minimum_force_magnitude: number | null;
    maximum_torque_magnitude: number | null;
    minimum_torque_magnitude: number | null;
    top_dead_spot_angle: number | null;
    bottom_dead_spot_angle: number | null;
    accumulated_energy: number | null;
  };

type CyclingPowerVector = {
    instantaneous_measurement_direction: InstantaneousMeasurementDirection,
    cumulative_crank_revs?: number,
    last_crank_event_time?: number,
    first_crank_measurement_angle?: number,
    instantaneous_force_magnitudes: number[],
    instantaneous_torque_magnitudes: number[]
  };
  
enum InstantaneousMeasurementDirection {
    unknown,
    tangential_component,
    radial_component,
    lateral_component
  };

class GenericSensor extends EventEmitter {
    address: string;
    isConnecting: boolean;
    isConnected: boolean;
    isNotifying: boolean;
    characteristic: string;
    service: string;

    constructor(address: string) {
        super()
        this.address = address
        this.isConnecting = false;
        this.isConnected = false;
        this.isNotifying = false;
        this.characteristic = '';
        this.service = '';
    }

    connect() : Promise<BleManager.PeripheralInfo> {
        this.isConnecting = true;  
        return new Promise( (resolve, reject) =>{
            BleManager.connect(this.address)
                .then(() => {
                    console.log('Connected success.');
                    this.isConnected = true;
                    return BleManager.retrieveServices(this.address);                    
                })
                .then((peripheralInfo: BleManager.PeripheralInfo)=>{
                    console.log('Connected peripheralInfo: ', peripheralInfo);                    
                    this.isConnecting = false;    
                    return peripheralInfo;
                })
                .then((peripheralInfo) => {
                    this.startNotification(this.address)
                    .then(() => {
                        this.isNotifying = true
                        resolve(peripheralInfo)
                    })
                    .catch((err) => {
                        resolve(err)
                    })
                })
                .catch((error: Error)=>{
                    console.log('Connected error:',error);
                    this.isConnecting = false;   
                    reject(error);
                });
        });
    }

    disconnect() : Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.isNotifying) {
                this.stopNotification(this.address)
                .then(() => {
                    console.log("Stopped notifictions on: ", this.address)
                })
                .catch((err) => {
                    reject(err)
                })
            }
            BleManager.disconnect(this.address)
            .then( () => {
                console.log('Disconnected');
                resolve(true)
            })
            .catch((err: Error) => {
                console.log('Disconnected error:',err);
                reject(err)
            }); 
        });
    }

    startNotification(peripheralId: string) : Promise<boolean> {
        return new Promise((resolve, reject) => {
        BleManager.startNotification(peripheralId, this.service, this.characteristic)
        .then(() => {
            console.log('Notifications started on: ', this.address);
            this.isNotifying = true;
            resolve(true)
        })
        .catch((err) => {
            reject(err)
        })
        }); 
    }

    stopNotification(peripheralId: string) : Promise<boolean> { 
        return new Promise( (resolve, reject) => {
        BleManager.stopNotification(peripheralId, this.service, this.characteristic)
        .then(() => {
            console.log('Notifications stopped on: ', this.address)
            this.isNotifying = false;
            resolve(true)
        })
        .catch((err) => {
            reject(err)
        })
        });
    }

    subscribe(listener: (data: any) => void) {
        // Subscribe to sensor data
        this.on('data', listener);
    }

    /**
     * Converts UUID to full 128bit.
     * 
     * @param {UUID} uuid 16bit, 32bit or 128bit UUID.
     * @returns {UUID} 128bit UUID.
     */
    fullUUID(uuid: string) {
        if (uuid.length === 4){
            return '0000' + uuid.toUpperCase() + '-0000-1000-8000-00805F9B34FB'
        }             
        if (uuid.length === 8) {
            return uuid.toUpperCase() + '-0000-1000-8000-00805F9B34FB'
        }            
        return uuid.toUpperCase()
    }  
}

class PowerMeter extends GenericSensor {

    constructor(address: string) {
        super(address)
        this.service = SupportedBleServices.CyclingPower;
        this.characteristic = CyclingPowerCharacteristics.CyclingPowerMeasurement
        bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this._listenUpdateChangeOnCharAndEmitData);
    }

    _listenUpdateChangeOnCharAndEmitData = (data: any) => {
        // listes for updates on BLE characteristics and emits a data event for only the power data.
        // console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
        if (data.characteristic.toUpperCase() == this.fullUUID(CyclingPowerCharacteristics.CyclingPowerMeasurement)) {
            let dataArray = new Uint8Array(data.value)
            const powerData = this.parseCyclingPowerMeasurement(dataArray)
            this.emit('data', powerData);
        }
        
      }

    parseCyclingPowerMeasurement(data: Uint8Array): CyclingPowerMeasurement {
        const flags = new DataView(data.buffer, data.byteOffset, 2).getUint16(0, true);
      
        const pedal_power_balance_included_flag = 1;
        const accumulated_torque_present = 1 << 2;
        const wheel_rev_included_flag = 1 << 4;
        const crank_rev_included_flag = 1 << 5;
        const extreme_force_included_flag = 1 << 6;
        const extreme_torque_included_flag = 1 << 7;
        const extreme_angles_included_flag = 1 << 8;
        const top_dead_spot_included_flag = 1 << 9;
        const bottom_dead_spot_included_flag = 1 << 10;
        const accumulated_energy_included_flag = 1 << 11;
      
        let byte_offset = 2;
      
        const instantaneous_power = new DataView(data.buffer, data.byteOffset + byte_offset, 2).getUint16(0, true);
        let pedal_power_balance = null;
        let accumulated_torque = null;
        let cumulative_wheel_revs = null;
        let last_wheel_event_time = null;
        let cumulative_crank_revs = null;
        let last_crank_event_time = null;
        let maximum_force_magnitude = null;
        let minimum_force_magnitude = null;
        let maximum_torque_magnitude = null;
        let minimum_torque_magnitude = null;
        let top_dead_spot_angle = null;
        let bottom_dead_spot_angle = null;
        let accumulated_energy = null;
      
        byte_offset += 2;
        if (flags & pedal_power_balance_included_flag) {
            pedal_power_balance = data[byte_offset];
            byte_offset += 1;
        }
      
        if (flags & accumulated_torque_present) {
            accumulated_torque = new DataView(data.buffer, data.byteOffset + byte_offset, 2).getUint16(0, true);
            byte_offset += 2;
        }
      
        if (flags & extreme_angles_included_flag) {
          // TODO: Implement extreme angles
          byte_offset += 3;
        }
        
        if (flags & top_dead_spot_included_flag) {
          const top_dead_spot_angle = new DataView(data.slice(byte_offset, byte_offset + 2)).getInt16(0, true);
          byte_offset += 2;
        }
        
        if (flags & bottom_dead_spot_included_flag) {
          const bottom_dead_spot_angle = new DataView(data.slice(byte_offset, byte_offset + 2)).getInt16(0, true);
          byte_offset += 2;
        }
        
        if (flags & accumulated_energy_included_flag) {
          const accumulated_energy = new DataView(data.slice(byte_offset, byte_offset + 2)).getInt16(0, true);
        }
      
        return {
          instantaneous_power,
          accumulated_energy,
          pedal_power_balance,
          accumulated_torque,
          cumulative_wheel_revs,
          last_wheel_event_time,
          cumulative_crank_revs,
          last_crank_event_time,
          maximum_force_magnitude,
          minimum_force_magnitude,
          maximum_torque_magnitude,
          minimum_torque_magnitude,
          top_dead_spot_angle,
          bottom_dead_spot_angle
        }
    }
}

class CadenceMeter extends GenericSensor {

    constructor(address: string) {
        super(address)
        this.service = SupportedBleServices.CyclingSpeedAndCadence;
        this.characteristic = CyclingPowerCharacteristics.CyclingPowerVector
        bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this._listenUpdateChangeOnCharAndEmitData);
    }

    _listenUpdateChangeOnCharAndEmitData = (data: any) => {
        // listes for updates on BLE characteristics and emits a data event for only the power data.
        // console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
        if (data.characteristic.toUpperCase() == this.fullUUID(CyclingPowerCharacteristics.CyclingPowerMeasurement)) {
            const cscData = this.parseCSCMeasurement(data.value)
            this.emit('data', cscData);
        }
    }

    parseCSCMeasurement(data: number[]): CSCMeasurement {
        const flags = data[0]? data[0] : 0;
        const wheelRevIncludedFlag = 1;
        const crankRevIncludedFlag = 2;
      
        let cumulativeWheelRevs: number | null = null;
        let lastWheelEventTime: number | null = null;
        let cumulativeCrankRevs: number | null = null;
        let lastCrankEventTime: number | null = null;
      
        let byteOffset = 1;
        if (flags & wheelRevIncludedFlag) {
            cumulativeWheelRevs = data.slice(byteOffset, 4 + byteOffset).reduce((p, c, i) => p + (c << (i * 8)), 0);
            lastWheelEventTime = data.slice(4 + byteOffset, 6 + byteOffset).reduce((p, c, i) => p + (c << (i * 8)), 0);
            byteOffset += 6;
        }
      
        if (flags & crankRevIncludedFlag) {
            cumulativeCrankRevs = data.slice(byteOffset, 2 + byteOffset).reduce((p, c, i) => p + (c << (i * 8)), 0);
            lastCrankEventTime = data.slice(2 + byteOffset, 4 + byteOffset).reduce((p, c, i) => p + (c << (i * 8)), 0);
        }
      
        return {
            cumulativeWheelRevs,
            lastWheelEventTime,
            cumulativeCrankRevs,
            lastCrankEventTime
        };
    }

}

export { BleSensors, PowerMeter, CadenceMeter}