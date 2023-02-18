import {
  Platform,
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription,
  PermissionsAndroid,
} from 'react-native';

import BleManager, { Peripheral } from 'react-native-ble-manager';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

import { EventEmitter } from 'eventemitter3';
import { Buffer } from 'buffer';

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
  SensorLocation = '2a5d',
}

type SensorList = {
  CyclingPower: Peripheral[];
  CyclingSpeedAndCadence: Peripheral[];
  HeartRate: Peripheral[];
};

interface typedPeripheral extends BleManager.Peripheral {
  sensorType?: string[];
}

class BleSensors {
  serviceUUIDs: string[] = [];

  constructor(serviceUUIDs: string[] = Object.values(SupportedBleServices)) {
    this.serviceUUIDs = serviceUUIDs;
  }

  checkState(): void {
    BleManager.checkState();
  }

  enableBluetooth(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      BleManager.enableBluetooth()
        .then(() => {
          console.log('The bluetooh is already enabled or the user confirm');
          resolve(true);
        })
        .catch((err: Error) => {
          console.log('The user refused to enable bluetooth: ' + err);
          reject(err);
        });
    });
  }

  requestPermissions(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'android' && Platform.Version >= 23) {
        PermissionsAndroid.requestMultiple([
          // @ts-ignore
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, // @ts-ignore
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, // @ts-ignore
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]).then((result) => {
          if (
            result['android.permission.ACCESS_FINE_LOCATION'] &&
            result['android.permission.BLUETOOTH_SCAN'] &&
            result['android.permission.BLUETOOTH_CONNECT'] === 'granted'
          ) {
            resolve(true);
            console.log('Permissions already granted');
          } else {
            PermissionsAndroid.requestMultiple([
              // @ts-ignore
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, // @ts-ignore
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, // @ts-ignore
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            ]).then((result) => {
              if (result) {
                console.log('User accept');
                resolve(true);
              } else {
                console.log('User refuse');
                reject(false);
              }
            });
          }
        });
      }
    });
  }

  start(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      BleManager.start({ showAlert: false })
        .then(() => {
          this.checkState();
          console.log('BleManager successfully started');
          resolve(true);
        })
        .catch((err) => {
          console.log('BleManager failed to start: ' + err);
          reject(err);
        });
    });
  }

  startSensorDiscovery(scanTime: number = 5) {
    // We only scan for the devices with serviceUUIDs we support.
    return new Promise((resolve, reject) => {
      BleManager.scan(this.serviceUUIDs, scanTime, true)
        .then(() => {
          console.log('Scan started');
          resolve(true);
        })
        .catch((err: Error) => {
          console.log('Scan started fail');
          reject(err);
        });
    });
  }

  stopSensorDiscovery(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      BleManager.stopScan()
        .then(() => {
          console.log('Scan stopped');
          resolve(true);
        })
        .catch((err: Error) => {
          console.log('Scan stopped fail', err);
          reject(err);
        });
    });
  }

  subscribeToDiscovery(func: any): EmitterSubscription {
    return bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', func);
  }

  subscribeToDiscoveryStop(func: any): EmitterSubscription {
    return bleManagerEmitter.addListener('BleManagerStopScan', func);
  }

  getDiscoveredSensors(): Promise<SensorList> {
    return new Promise((resolve, reject) => {
      BleManager.getDiscoveredPeripherals()
        .then((peripheralsArray: Peripheral[]) => {
          console.log('Discovered peripherals: ', peripheralsArray);
          let list: SensorList = {
            CyclingPower: [],
            CyclingSpeedAndCadence: [],
            HeartRate: [],
          };
          peripheralsArray.forEach((device) => {
            if (device.advertising.serviceUUIDs) {
              console.log('serviceUUIDs = ', device.advertising.serviceUUIDs);
              if (
                device.advertising.serviceUUIDs.includes(
                  SupportedBleServices.CyclingPower
                )
              ) {
                list.CyclingPower.push(device);
              }
              if (
                device.advertising.serviceUUIDs.includes(
                  SupportedBleServices.CyclingSpeedAndCadence
                )
              ) {
                list.CyclingSpeedAndCadence.push(device);
              }
              if (
                device.advertising.serviceUUIDs.includes(
                  SupportedBleServices.HeartRate
                )
              ) {
                list.HeartRate.push(device);
              }
            }
          });
          resolve(list);
        })
        .catch((err: Error) => {
          console.log('Error getting discovered peripherals: ' + err);
          reject(err);
        });
    });
  }

  getConnectedSensors(): Promise<typedPeripheral[]> {
    return new Promise((resolve, reject) => {
      BleManager.getConnectedPeripherals([])
        .then((peripheralsArray: Peripheral[]) => {
          let connectedSensorsList = this._getPeripheralType(peripheralsArray)
          resolve(connectedSensorsList)
        })
        .catch((err: Error) => {
          console.log('Error getting connected peripherals: ' + err);
          reject(err);
        });
    });
  }

  _getPeripheralType(list: Peripheral[]): typedPeripheral[] {
      let connectedList: typedPeripheral[] = []
      list.forEach((device) => {
        if (device.advertising.serviceUUIDs) {
          let tDevice: typedPeripheral = device;
          tDevice.sensorType = []
          if (
            device.advertising.serviceUUIDs.includes(
              SupportedBleServices.CyclingPower
            )
          ) { 
            tDevice.sensorType.push('CyclingPower')
          } 
          if (
            device.advertising.serviceUUIDs.includes(
              SupportedBleServices.CyclingSpeedAndCadence
            )
          ) {
            tDevice.sensorType.push('CyclingSpeedAndCadence')
          } else if (
            device.advertising.serviceUUIDs.includes(
              SupportedBleServices.HeartRate
            )
          ) {
            tDevice.sensorType.push('HeartRate')
          }
          connectedList.push(tDevice)
        }
      });
      return connectedList
  }
}

enum CyclingPowerCharacteristics {
  CyclingPowerMeasurement = '00002a63-0000-1000-8000-00805f9b34fb',
  CyclingPowerFeature = '00002a65-0000-1000-8000-00805f9b34fb',
  CyclingPowerVector = '00002a64-0000-1000-8000-00805f9b34fb',
  CyclingPowerControlPoint = '00002a66-0000-1000-8000-00805f9b34fb',
  SensorLocation = '00002a5d-0000-1000-8000-00805f9b34fb',
}

type CSCMeasurement = {
  cumulativeWheelRevs: number | null;
  lastWheelEventTime: number | null;
  cumulativeCrankRevs: number | null;
  lastCrankEventTime: number | null;
};

// type CSCFeature = {
//     wheelRevSupported: boolean,
//     crankRevSupported: boolean,
//     multipleLocationsSupported: boolean
//   }

type CyclingPowerMeasurement = {
  instantaneous_power: number;
  pedal_power_balance?: number | null;
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

// type CyclingPowerVector = {
//     instantaneous_measurement_direction: InstantaneousMeasurementDirection,
//     cumulative_crank_revs?: number,
//     last_crank_event_time?: number,
//     first_crank_measurement_angle?: number,
//     instantaneous_force_magnitudes: number[],
//     instantaneous_torque_magnitudes: number[]
//   };

// enum InstantaneousMeasurementDirection {
//     unknown,
//     tangential_component,
//     radial_component,
//     lateral_component
//   };

enum SensorLocation {
  other = 1,
  top_of_shoe,
  in_shoe,
  hip,
  front_wheel,
  left_crank,
  right_crank,
  left_pedal,
  right_pedal,
  front_hub,
  rear_dropout,
  chainstay,
  rear_wheel,
  rear_hub,
  chest,
  spider,
  chain_ring,
}

class GenericSensor extends EventEmitter {
  address: string;
  isConnecting: boolean;
  isConnected: boolean;
  isNotifying: boolean;
  characteristic: string;
  service: string;
  services: string[];

  constructor(address: string) {
    super();
    this.address = address;
    this.isConnecting = false;
    this.isConnected = false;
    this.isNotifying = false;
    this.characteristic = '';
    this.service = '';
    this.services = [];
  }

  connect(): Promise<BleManager.PeripheralInfo> {
    this.isConnecting = true;
    return new Promise((resolve, reject) => {
      BleManager.connect(this.address)
        .then(() => {
          console.log('Connected success.');
          this.isConnected = true;
          return BleManager.retrieveServices(this.address);
        })
        .then((peripheralInfo: BleManager.PeripheralInfo) => {
          console.log('Connected peripheralInfo: ', peripheralInfo);
          this.isConnecting = false;
          this.services = peripheralInfo.services
            ? peripheralInfo.services.map((obj) => obj.uuid)
            : [];
          return peripheralInfo;
        })
        .then((peripheralInfo) => {
          this.startNotification(this.address)
            .then(() => {
              this.isNotifying = true;
              resolve(peripheralInfo);
            })
            .catch((err) => {
              resolve(err);
            });
        })
        .catch((error: Error) => {
          // console.log('Connected error:',error);
          this.isConnecting = false;
          reject(error);
        });
    });
  }

  disconnect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.isNotifying) {
        this.stopNotification(this.address)
          .then(() => {
            console.log('Stopped notifictions on: ', this.address);
          })
          .catch((err) => {
            reject(err);
          });
      }
      BleManager.disconnect(this.address)
        .then(() => {
          console.log('Disconnected');
          resolve(true);
        })
        .catch((err: Error) => {
          // console.log('Disconnected error:',err);
          reject(err);
        });
    });
  }

  startNotification(peripheralId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      BleManager.startNotification(
        peripheralId,
        this.service,
        this.characteristic
      )
        .then(() => {
          console.log('Notifications started on: ', this.address);
          this.isNotifying = true;
          resolve(true);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  stopNotification(peripheralId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      BleManager.stopNotification(
        peripheralId,
        this.service,
        this.characteristic
      )
        .then(() => {
          console.log('Notifications stopped on: ', this.address);
          this.isNotifying = false;
          resolve(true);
        })
        .catch((err) => {
          reject(err);
        });
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
    if (uuid.length === 4) {
      return '0000' + uuid.toUpperCase() + '-0000-1000-8000-00805F9B34FB';
    }
    if (uuid.length === 8) {
      return uuid.toUpperCase() + '-0000-1000-8000-00805F9B34FB';
    }
    return uuid.toUpperCase();
  }
}

class PowerMeter extends GenericSensor {
  // TODO: Implement CSC for power meters that have '2a5d` char on the 1818 power service
  constructor(address: string) {
    super(address);
    this.service = SupportedBleServices.CyclingPower;
    this.characteristic = CyclingPowerCharacteristics.CyclingPowerMeasurement;
    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      this._listenUpdateChangeOnCharAndEmitData
    );
  }

  _listenUpdateChangeOnCharAndEmitData = (data: any) => {
    // listes for updates on BLE characteristics and emits a data event for only the power data.
    // console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
    if (
      data.characteristic.toUpperCase() ===
      this.fullUUID(CyclingPowerCharacteristics.CyclingPowerMeasurement)
    ) {
      let dataArray = new Uint8Array(data.value);
      const powerData = this.parseCyclingPowerMeasurement(dataArray);
      this.emit('data', powerData);
    }
  };

  parseCyclingPowerMeasurement(data: Uint8Array): CyclingPowerMeasurement {
    const flags = new DataView(data.buffer, data.byteOffset, 2).getUint16(
      0,
      true
    );

    const pedal_power_balance_included_flag = 1;
    const accumulated_torque_present = 1 << 2; /* eslint-disable */
    // const wheel_rev_included_flag = 1 << 4; /* eslint-disable */
    // const crank_rev_included_flag = 1 << 5; /* eslint-disable */
    // const extreme_force_included_flag = 1 << 6; /* eslint-disable */
    // const extreme_torque_included_flag = 1 << 7; /* eslint-disable */
    const extreme_angles_included_flag = 1 << 8;
    const top_dead_spot_included_flag = 1 << 9;
    const bottom_dead_spot_included_flag = 1 << 10;
    const accumulated_energy_included_flag = 1 << 11;

    let byte_offset = 2;

    const instantaneous_power = new DataView(
      data.buffer,
      data.byteOffset + byte_offset,
      2
    ).getUint16(0, true);
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
      pedal_power_balance = data[byte_offset] ? data[byte_offset] : null;
      byte_offset += 1;
    }

    if (flags & accumulated_torque_present) {
      accumulated_torque = new DataView(
        data.buffer,
        data.byteOffset + byte_offset,
        2
      ).getUint16(0, true);
      byte_offset += 2;
    }

    if (flags & extreme_angles_included_flag) {
      // TODO: Implement extreme angles
      byte_offset += 3;
    }

    if (flags & top_dead_spot_included_flag) {
      top_dead_spot_angle = new DataView(
        data.slice(byte_offset, byte_offset + 2)
      ).getInt16(0, true);
      byte_offset += 2;
    }

    if (flags & bottom_dead_spot_included_flag) {
      bottom_dead_spot_angle = new DataView(
        data.slice(byte_offset, byte_offset + 2)
      ).getInt16(0, true);
      byte_offset += 2;
    }

    if (flags & accumulated_energy_included_flag) {
      accumulated_energy = new DataView(
        data.slice(byte_offset, byte_offset + 2)
      ).getInt16(0, true);
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
      bottom_dead_spot_angle,
    };
  }

  getSensorLocation() {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        BleManager.retrieveServices(this.address)
          .then((peripheralInfo) => {
            // Success code
            console.log('Services:', peripheralInfo.services);
            const charStrings = peripheralInfo.characteristics
              ? peripheralInfo.characteristics.map((obj) => obj.characteristic)
              : [];
            if (charStrings.includes('2a5d')) {
              console.log('Sensor location feature supported');
              BleManager.read(this.address, this.service, '2a5d')
                .then((readData) => {
                  // TODO: fix the below
                  console.log('Read Sensor Location: ' + readData);
                  const buffer = Buffer.from(readData);
                  const sensorData = buffer.readUInt8(0);
                  console.log('sensor location parsed: ', sensorData);
                  resolve(SensorLocation[sensorData]);
                })
                .catch((error) => {
                  console.log(error);
                  resolve(error);
                });
            } else reject(new Error('Sensor Location not supported'));
            resolve(true);
          })
          .catch((err) => {
            console.log(err);
            resolve(err);
          });
      } else {
        reject(new Error("Can't get services of unconnected device"));
      }
    });
  }
}

class CadenceMeter extends GenericSensor {
  constructor(address: string) {
    super(address);
    this.service = SupportedBleServices.CyclingSpeedAndCadence;
    this.characteristic = CyclingPowerCharacteristics.CyclingPowerVector;
    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      this._listenUpdateChangeOnCharAndEmitData
    );
  }

  _listenUpdateChangeOnCharAndEmitData = (data: any) => {
    // listes for updates on BLE characteristics and emits a data event for only the power data.
    // console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
    if (
      data.characteristic.toUpperCase() ==
      this.fullUUID(CyclingPowerCharacteristics.CyclingPowerMeasurement)
    ) {
      const cscData = this.parseCSCMeasurement(data.value);
      this.emit('data', cscData);
    }
  };

  parseCSCMeasurement(data: number[]): CSCMeasurement {
    const flags = data[0] ? data[0] : 0;
    const wheelRevIncludedFlag = 1;
    const crankRevIncludedFlag = 2;

    let cumulativeWheelRevs: number | null = null;
    let lastWheelEventTime: number | null = null;
    let cumulativeCrankRevs: number | null = null;
    let lastCrankEventTime: number | null = null;

    let byteOffset = 1;
    if (flags & wheelRevIncludedFlag) {
      cumulativeWheelRevs = data
        .slice(byteOffset, 4 + byteOffset)
        .reduce((p, c, i) => p + (c << (i * 8)), 0);
      lastWheelEventTime = data
        .slice(4 + byteOffset, 6 + byteOffset)
        .reduce((p, c, i) => p + (c << (i * 8)), 0);
      byteOffset += 6;
    }

    if (flags & crankRevIncludedFlag) {
      cumulativeCrankRevs = data
        .slice(byteOffset, 2 + byteOffset)
        .reduce((p, c, i) => p + (c << (i * 8)), 0);
      lastCrankEventTime = data
        .slice(2 + byteOffset, 4 + byteOffset)
        .reduce((p, c, i) => p + (c << (i * 8)), 0);
    }

    return {
      cumulativeWheelRevs,
      lastWheelEventTime,
      cumulativeCrankRevs,
      lastCrankEventTime,
    };
  }
}

enum HeartRateCharacteristics {
  HeartRateMeasurement = '00002a37-0000-1000-8000-00805f9b34fb',
}

type HeartRateMeasurement = {
  sensorContact?: boolean;
  bpm: number | undefined;
  rrInterval?: number[];
  energyExpended?: number;
};

class HeartRateMonitor extends GenericSensor {
  constructor(address: string) {
    super(address);
    this.service = SupportedBleServices.HeartRate;
    this.characteristic = HeartRateCharacteristics.HeartRateMeasurement;
    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      this._listenUpdateChangeOnCharAndEmitData
    );
  }

  _listenUpdateChangeOnCharAndEmitData = (data: any) => {
    // listens for updates on BLE characteristics and emits a data event for only the HR data.
    if (
      data.characteristic.toUpperCase() ==
      this.fullUUID(HeartRateCharacteristics.HeartRateMeasurement)
    ) {
      const buf = Buffer.from(data.value);
      const hrData = this.parseHeartRateMeasurement(buf);
      this.emit('data', hrData);
    }
  };

  parseHeartRateMeasurement(data: Buffer): HeartRateMeasurement {
    const flags = data[0];

    const isUint16MeasurementMask = 0x01;
    const isContactDetectedMask = 0x06;
    const isEnergyExpendedPresentMask = 0x08;
    const isRRIntervalPresentMask = 0x10;

    let sensorContact: boolean | undefined;
    let bpm: number | undefined;
    const rrInterval: number[] = [];
    let energyExpended: number | undefined;

    let measurementByteOffset = 1;
    if (flags) {
      sensorContact = Boolean(flags & isContactDetectedMask);

      if (flags & isUint16MeasurementMask) {
        bpm = data.readUInt16LE(measurementByteOffset);
        measurementByteOffset += 2;
      } else {
        bpm = data[measurementByteOffset];
        measurementByteOffset += 1;
      }

      if (flags & isEnergyExpendedPresentMask) {
        energyExpended = data.readUInt16LE(measurementByteOffset);
        measurementByteOffset += 2;
      }

      if (flags & isRRIntervalPresentMask) {
        while (data.length >= measurementByteOffset + 2) {
          rrInterval.push(data.readUInt16LE(measurementByteOffset));
          measurementByteOffset += 2;
        }
      }
    }

    return {
      sensorContact,
      bpm,
      rrInterval,
      energyExpended,
    };
  }
}

export { BleSensors, PowerMeter, CadenceMeter, HeartRateMonitor };

// parseCSCFeature(measurement: Buffer): CSCFeature {
//     const value = measurement.readUInt16LE(0);
//     const wheelRevSupported = (value & 0b1) !== 0;
//     const crankRevSupported = (value & 0b10) !== 0;
//     const multipleLocationsSupported = (value & 0b100) !== 0;
//     return {
//       wheelRevSupported,
//       crankRevSupported,
//       multipleLocationsSupported
//     };
// }

// parseCyclingPowerVector(data: Uint8Array): CyclingPowerVector {
//     let flags = data[0];

//     let crank_revolutions_present = (flags & 0b1) !== 0;
//     let first_crank_measurement_angle_present = (flags & 0b10) !== 0;
//     let instantaneous_force_array_present = (flags & 0b100) !== 0;
//     let instantaneous_torque_array_present = (flags & 0b1000) !== 0;
//     let instantaneous_measurement_direction_value = (flags & 0b110000) >> 4;

//     let instantaneous_measurement_direction = InstantaneousMeasurementDirection.unknown;
//     if (instantaneous_measurement_direction_value === 1) {
//       instantaneous_measurement_direction = InstantaneousMeasurementDirection.tangential_component;
//     } else if (instantaneous_measurement_direction_value === 2) {
//       instantaneous_measurement_direction = InstantaneousMeasurementDirection.radial_component;
//     } else if (instantaneous_measurement_direction_value === 3) {
//       instantaneous_measurement_direction = InstantaneousMeasurementDirection.lateral_component;
//     }

//     let byte_offset = 1;
//     let cumulative_crank_revs: number | null;
//     let last_crank_event_time: number | null;
//     let first_crank_measurement_angle: number | null;
//     let instantaneous_force_magnitudes: number[] = [];
//     let instantaneous_torque_magnitudes: number[] = [];

//     if (crank_revolutions_present) {
//       cumulative_crank_revs = new DataView(data.buffer, data.byteOffset + byte_offset, 2).getUint16(0, true);
//       byte_offset += 2;
//       last_crank_event_time = new DataView(data.buffer, data.byteOffset + byte_offset, 2).getUint16(0, true);
//       byte_offset += 2;
//     }

//     if (first_crank_measurement_angle_present) {
//       first_crank_measurement_angle = new DataView(data.buffer, data.byteOffset + byte_offset, 2).getUint16(0, true);
//       byte_offset += 2;
//     }

//     for (let i = byte_offset; i < data.length; i += 2) {
//       let element = new DataView(data.buffer, data.byteOffset + i, 2).getUint16(0, true);
//       if (instantaneous_force_array_present) {
//           instantaneous_force_magnitudes.push(element);
//       } else if (instantaneous_torque_array_present) {
//           instantaneous_torque_magnitudes.push(element);
//       }
//     }

//     return {
//         instantaneous_measurement_direction,
//         cumulative_crank_revs,
//         last_crank_event_time,
//         first_crank_measurement_angle,
//         instantaneous_force_magnitudes,
//         instantaneous_torque_magnitudes
//     };

// }
