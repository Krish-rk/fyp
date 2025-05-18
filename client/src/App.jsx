import React, { useEffect, useState } from "react";
import { useSigner, useAddress } from "@thirdweb-dev/react";
import { Contract } from "@ethersproject/contracts";
import mqtt from "mqtt";
import {
  Layout,
  Typography,
  Card,
  Switch,
  Statistic,
  Row,
  Col,
  message,
  Button,
  Input,
  Tag,
  Space,
  Result,
} from "antd";
import {
  PlusCircleOutlined,
  ArrowRightOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import "./App.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// Contract Configuration
const contractAddress =
  import.meta.env.VITE_PIN_CONTROLLER_CONTRACT_ADDRESS ||
  "0xf7A218961DA9187BB43171F69581b511876b4d96";
const contractABI = [
  "event DeviceRegistered(uint256 indexed deviceId, address indexed owner)",
  "event DeviceOwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event DevicePinStatusChanged(uint256 indexed _deviceId, uint8 indexed pin, uint8 status)",
  "function currentDeviceId() view returns (uint256)",
  "function devices(uint256) view returns (uint256 id, address owner)",
  "function getDevicePinStatus(uint256 _deviceId, uint8 _pin) view returns (uint8)",
  "function registerDevice() returns (uint256)",
  "function setDevicePinStatus(uint256 _deviceId, uint8 _pin, uint8 _pinStatus)",
  "function transferDeviceOwnership(uint256 _deviceId, address _newOwner)",
];

const contract = new Contract(contractAddress, contractABI);

// Pin and Sensor Topics
const pinTopics = {
  13: "home/living/light",
  14: "home/living/fan",
  16: "home/bedroom/light",
  17: "home/bedroom/fan",
  23: "home/kitchen/pump",
  27: "home/door/lock",
};

const sensorTopics = {
  "home/living/temperature": "Living Room Temperature",
  "home/living/humidity": "Living Room Humidity",
  "home/bedroom/temperature": "Bedroom Temperature",
  "home/bedroom/humidity": "Bedroom Humidity",
  "home/kitchen/fire": "Kitchen Fire Detection",
  "home/kitchen/waterLevel": "Kitchen Water Level",
};

// SVG Icons
const DeviceIcons = {
  light: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  ),
  fan: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.5 20.5c.5 1 1.5 1.5 2.5 1.5 1.5 0 2.5-1 2.5-2.5 0-1.5-1-2.5-2.5-2.5-1 0-2 .5-2.5 1.5" />
      <path d="m15.5 13.5-2-2" />
      <path d="m6 8 2 2" />
      <path d="m12 18 1.5-1.5" />
      <path d="m12 13 2-2" />
      <path d="m12 8-1.5 1.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 4.5V2M12 22v-2.5M4.5 12H2M22 12h-2.5" />
    </svg>
  ),
  lock: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  pump: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 16h2c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h2" />
      <path d="M10 14l1 1 2-2 2 2 1-1" />
    </svg>
  ),
};

const SensorIcons = {
  temperature: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </svg>
  ),
  humidity: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.2 7.8c.5.5.8 1.2.8 1.9 0 1.6-1.4 3-3 3h-6.8l.7.7a3 3 0 1 1-4.2 4.2L4 15.4" />
      <path d="M17.5 4.8v.2a3 3 0 1 0-4.2-4.2l-5 5a6 6 0 0 0 8.5 8.5" />
    </svg>
  ),
  fire: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 12c2-2.96 0-7-5-7C4 8 2 12 2 16c0 5 4 7 10 7s10-2 10-7c0-2-1-5-3-7a5 5 0 0 1-3 0A5 5 0 0 0 8 5" />
    </svg>
  ),
  water: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  ),
};

function App() {
  // State Management
  const [loading, setLoading] = useState({});
  const [deviceOwner, setDeviceOwner] = useState("");
  const [pinStates, setPinStates] = useState({});
  const [deviceId, setDeviceId] = useState(null);
  const [deviceIdInput, setDeviceIdInput] = useState(0);
  const [newOwner, setNewOwner] = useState("");
  const [sensorData, setSensorData] = useState({
    living: { temperature: null, humidity: null },
    bedroom: { temperature: null, humidity: null },
    kitchen: { fire: null, waterLevel: null },
  });

  // Web3 Hooks
  const account = useAddress();
  const signer = useSigner();

  // MQTT Connection State
  const [mqttClient, setMqttClient] = useState(null);
  const [mqttConnected, setMqttConnected] = useState(false);

  // MQTT Connection Effect
  useEffect(() => {
    const mqttBrokerIP = "ws://192.168.70.110:9001"; // Replace <BROKER_IP> with your MQTT broker's IP or domain
    const options = {
      rejectUnauthorized: false, // Allow insecure TLS connections (bypass certificate validation)
      // Remove or comment out the following lines if not using certificates:
      // ca: "path/to/ca.crt",
      // key: "path/to/client.key",
      // cert: "path/to/client.crt",
      // username: "your_username", // Optional: MQTT username if authentication is required
      // password: "your_password", // Optional: MQTT password if authentication is required
    };

    const client = mqtt.connect(mqttBrokerIP);

    client.on("connect", () => {
      setMqttConnected(true);
      console.log("MQTT connected!");

      // Subscribe to pin actuator topics
      Object.values(pinTopics).forEach((topic) => {
        client.subscribe(topic, (err) => {
          if (!err) console.log(`Subscribed to ${topic}`);
        });
      });

      // Subscribe to sensor data topics
      Object.keys(sensorTopics).forEach((topic) => {
        client.subscribe(topic, (err) => {
          if (!err) console.log(`Subscribed to ${topic}`);
        });
      });
    });

    client.on("message", (topic, message) => {
      console.log(`Message received on topic ${topic}:`, message.toString());
      try {
        const data = message.toString().trim(); // Trim whitespace

        // Update sensor data dynamically
        if (sensorTopics[topic]) {
          const [room, sensorType] = topic.split("/").slice(1);

          // Parse the data based on sensor type
          let parsedValue;
          switch (sensorType) {
            case "temperature":
            case "humidity":
              // Try to parse as a number, allowing decimal values
              parsedValue = parseFloat(data);
              if (isNaN(parsedValue)) {
                console.warn(`Invalid numeric value for ${topic}: ${data}`);
                parsedValue = null;
              }
              break;
            case "waterLevel":
            case "fire":
              // Handle boolean/string representations
              parsedValue =
                data.toLowerCase() === "true" ||
                data === "1" ||
                data.toLowerCase() === "high";
              break;
            default:
              parsedValue = data;
          }

          // Debug logging
          console.log(`Updating ${room} ${sensorType}:`, parsedValue);

          setSensorData((prevData) => {
            // Create a deep copy to ensure immutability
            const newData = JSON.parse(JSON.stringify(prevData));

            // Safely update the nested property
            if (newData[room]) {
              newData[room][sensorType] = parsedValue;
            }

            return newData;
          });
        }

        // Update pin states dynamically
        const pinKey = Object.keys(pinTopics).find(
          (key) => pinTopics[key] === topic
        );
        if (pinKey) {
          const newState =
            data.toLowerCase() === "on" ||
            data.toLowerCase() === "true" ||
            data === "1";
          setPinStates((prevStates) => ({
            ...prevStates,
            [pinKey]: newState,
          }));
        }
      } catch (err) {
        console.error("Failed to parse MQTT message:", err);
      }
    });

    setMqttClient(client);

    return () => {
      if (client) {
        client.end();
        console.log("MQTT disconnected");
      }
    };
  }, []);

  // Device Registration
  const handleRegisterDevice = async () => {
    if (!account || !signer) return message.error("Please connect your wallet");
    try {
      setLoading({ registerDevice: true });
      const tx = await contract.connect(signer).registerDevice();
      message.info(
        "Device registration transaction sent. Waiting for confirmation..."
      );
      const receipt = await tx.wait();
      const deviceId = receipt?.events[0]?.args?.deviceId;
      message.success(`Device registered with ID: ${deviceId.toString()}`);
      setDeviceId(deviceId);
    } catch (err) {
      message.error("Failed to register device");
    } finally {
      setLoading({ registerDevice: false });
    }
  };

  // Pin Status Control
  const handleSetPinStatus = async (pin, status) => {
    if (!account || !signer) return message.error("Please connect your wallet");
    if (deviceOwner?.toLowerCase() !== account.toLowerCase())
      return message.error("Only device owner can control these pins");
    try {
      setLoading({ [pin]: true });
      const tx = await contract
        .connect(signer)
        .setDevicePinStatus(deviceId, pin, +status);
      await tx.wait();
      message.success(`Pin ${pin} is now turned ${status ? "on" : "off"}`);
      setPinStates({ ...pinStates, [pin]: status });
    } catch (err) {
      message.error("Failed to set pin status");
      setPinStates({ ...pinStates, [pin]: !status });
    } finally {
      setLoading({ [pin]: false });
    }
  };

  // Device Ownership Transfer
  const handleTransferDeviceOwnership = async (newOwner) => {
    if (!account || !signer) return message.error("Please connect your wallet");
    if (!newOwner) return message.error("Please enter new owner address");
    try {
      setLoading({ transferOwnership: true });
      const tx = await contract
        .connect(signer)
        .transferDeviceOwnership(deviceId, newOwner);
      await tx.wait();
      message.success(`Device Ownership transferred to ${newOwner}`);
    } catch (err) {
      message.error("Failed to transfer device ownership");
    } finally {
      setLoading({ transferOwnership: false });
    }
  };

  // Get Device Owner
  const getDeviceOwner = async () => {
    if (!signer) return;
    try {
      const device = await contract.connect(signer).devices(deviceId);
      setDeviceOwner(device?.owner);
    } catch (err) {
      message.error("Failed to get device owner");
    }
  };

  // Device Owner Effect
  useEffect(() => {
    if (deviceId === null) return;
    getDeviceOwner();
  }, [signer, deviceId]);

  // Update the initial state to have nested objects with default values

  // Modify the roomConfigurations to use optional chaining and nullish coalescing
  // ... (previous code remains the same)

  const roomConfigurations = {
    living: {
      name: "Living Room",
      pins: [
        { pin: 13, topic: "home/living/light", icon: DeviceIcons.light },
        { pin: 14, topic: "home/living/fan", icon: DeviceIcons.fan },
      ],
      sensors: [
        {
          type: "temperature",
          icon: SensorIcons.temperature,
          key: "temperature",
          color:
            (sensorData?.living?.temperature ?? null) == null
              ? "gray"
              : sensorData.living.temperature > 25
              ? "red"
              : sensorData.living.temperature < 20
              ? "blue"
              : "green",
          suffix: "°C",
        },
        {
          type: "humidity",
          icon: SensorIcons.humidity,
          key: "humidity",
          color:
            (sensorData?.living?.humidity ?? null) == null
              ? "gray"
              : sensorData.living.humidity > 70
              ? "blue"
              : sensorData.living.humidity < 30
              ? "red"
              : "green",
          suffix: "%",
        },
      ],
    },
    bedroom: {
      name: "Bedroom",
      pins: [
        { pin: 16, topic: "home/bedroom/light", icon: DeviceIcons.light },
        { pin: 17, topic: "home/bedroom/fan", icon: DeviceIcons.fan },
      ],
      sensors: [
        {
          type: "temperature",
          icon: SensorIcons.temperature,
          key: "temperature",
          color:
            (sensorData?.bedroom?.temperature ?? null) == null
              ? "gray"
              : sensorData.bedroom.temperature > 25
              ? "red"
              : sensorData.bedroom.temperature < 20
              ? "blue"
              : "green",
          suffix: "°C",
        },
        {
          type: "humidity",
          icon: SensorIcons.humidity,
          key: "humidity",
          color:
            (sensorData?.bedroom?.humidity ?? null) == null
              ? "gray"
              : sensorData.bedroom.humidity > 70
              ? "blue"
              : sensorData.bedroom.humidity < 30
              ? "red"
              : "green",
          suffix: "%",
        },
      ],
    },
    kitchen: {
      name: "Kitchen",
      pins: [{ pin: 23, topic: "home/kitchen/pump", icon: DeviceIcons.pump }],
      sensors: [
        {
          type: "fire",
          icon: SensorIcons.fire,
          key: "fire",
          color:
            (sensorData?.kitchen?.fire ?? null) == null
              ? "gray"
              : sensorData.kitchen.fire
              ? "red"
              : "green",
          valueMap: (val) =>
            val != null ? (val ? "Detected" : "Safe") : "N/A",
        },
        {
          type: "water level",
          icon: SensorIcons.water,
          key: "waterLevel",
          color:
            (sensorData?.kitchen?.waterLevel ?? null) == null
              ? "gray"
              : sensorData.kitchen.waterLevel
              ? "blue"
              : "green",
          valueMap: (val) => (val != null ? (val ? "High" : "Low") : "N/A"),
        },
      ],
    },
    // New entry section with door lock
    entry: {
      name: "Entry",
      pins: [{ pin: 27, topic: "home/door/lock", icon: DeviceIcons.lock }],
      sensors: [],
      /*{ 
        type: 'camera', 
        icon: () => (
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
        ),
        key: 'cameraStream',
        renderComponent: () => {
          const [imageSource, setImageSource] = useState('');

          useEffect(() => {
            // Setup MQTT client to receive camera stream
            const client = mqtt.connect('ws://192.168.173.32:9001');
            
            client.on('connect', () => {
              client.subscribe('door/image');
            });

            client.on('message', (topic, message) => {
              if (topic === 'door/image') {
                setImageSource(message.toString());
              }
            });

            return () => {
              client.end();
            };
          }, []);

          return (
            <div style={{ 
              width: '100%', 
              maxWidth: '400px', 
              margin: '0 auto',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {imageSource ? (
                <img 
                  src={imageSource} 
                  alt="Door Camera Stream" 
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    objectFit: 'cover' 
                  }}
                />
              ) : (
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '200px',
                    color: 'gray'
                  }}
                >
                  No Camera Feed
                </div>
              )}
            </div>
          );
        }
      }
    ]*/
    },
  };

  ``;
  // In the RoomCard component, modify the Statistic to handle null values
  const RoomCard = ({ room }) => {
    const { name, pins, sensors } = room;
    const [imageSource, setImageSource] = useState("");

    useEffect(() => {
      if (name === "Entry") {
        const ws = new WebSocket("ws://192.168.70.117:81");

        ws.onmessage = (event) => {
          const blob = new Blob([event.data], { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);
          setImageSource(url);
        };

        return () => {
          if (imageSource) {
            URL.revokeObjectURL(imageSource);
          }
          ws.close();
        };
      }
    }, [name]);

    return (
      <Card
        title={name}
        style={{
          marginBottom: "16px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          width: "100%",
        }}
        bodyStyle={{ padding: "12px" }}
      >
        <Row gutter={[8, 8]} align="stretch" justify="center">
          {/* Actuators Column */}
          <Col
            xs={24}
            sm={24}
            md={name === "Entry" ? 12 : 12}
            lg={name === "Entry" ? 12 : 12}
          >
            <Typography.Text strong style={{ marginBottom: "8px" }}>
              Actuators
            </Typography.Text>
            <Row
              gutter={[8, 8]} // Reduced gutter size
              justify="center"
              align="stretch"
              style={{ width: "100%" }}
            >
              {pins.map(({ pin, topic, icon: Icon }) => (
                <Col
                  key={pin}
                  xs={12}
                  sm={12}
                  md={12}
                  lg={12}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Card
                    hoverable
                    style={{
                      textAlign: "center",
                      width: "100%",
                      maxWidth: "180px",
                      height: "180px", // Reduced height
                      background: pinStates[pin] ? "#f6ffed" : "#fff1f0",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px", // Reduced padding
                    }}
                  >
                    <div
                      style={{
                        marginBottom: "8px",
                        color: pinStates[pin] ? "green" : "red",
                        height: "40px", // Reduced height
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <Switch
                        checked={pinStates[pin] || false}
                        onChange={(checked) => handleSetPinStatus(pin, checked)}
                        loading={loading[pin]}
                      />
                      <Typography.Text
                        style={{
                          display: "block",
                          marginTop: "4px",
                          fontSize: "0.8rem",
                        }}
                      >
                        {topic.split("/").pop()}
                      </Typography.Text>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>

          {/* Video Stream for Entry Room */}
          {name === "Entry" && (
            <Col xs={24} sm={24} md={12} lg={12}>
              <Typography.Text strong style={{ marginBottom: "8px" }}>
                Camera Stream
              </Typography.Text>
              <div
                style={{
                  width: "100%",
                  height: "300px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  background: "#f5f5f5",
                }}
              >
                {imageSource ? (
                  <img
                    src={imageSource}
                    alt="Camera Stream"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      color: "gray",
                      textAlign: "center",
                    }}
                  >
                    <p>Connecting to camera...</p>
                  </div>
                )}
              </div>
            </Col>
          )}

          {/* Sensors Column (for non-Entry rooms) */}
          {name !== "Entry" && sensors.length > 0 && (
            <Col xs={24} sm={24} md={12} lg={12}>
              <Typography.Text strong style={{ marginBottom: "8px" }}>
                Sensors
              </Typography.Text>
              <Row
                gutter={[8, 8]} // Reduced gutter size
                justify="center"
                align="stretch"
                style={{ width: "100%" }}
              >
                {sensors.map(
                  ({ type, icon: Icon, key, color, suffix, valueMap }) => (
                    <Col
                      key={type}
                      xs={12}
                      sm={12}
                      md={12}
                      lg={12}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Card
                        style={{
                          textAlign: "center",
                          width: "100%",
                          maxWidth: "180px",
                          height: "180px", // Reduced height
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "8px", // Reduced padding
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <Icon />
                          <Typography.Text
                            strong
                            style={{
                              marginLeft: "6px",
                              fontSize: "0.85rem",
                            }}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Typography.Text>
                        </div>
                        <Statistic
                          value={(() => {
                            const rawValue =
                              sensorData?.[
                                name.toLowerCase().replace(" ", "")
                              ]?.[key];

                            // Handle undefined/null cases
                            if (rawValue == null) return "N/A";

                            // If there's a custom value mapping function, use it
                            if (valueMap) return valueMap(rawValue);

                            // Handle numeric values (temperature, humidity)
                            if (typeof rawValue === "number") {
                              return rawValue.toFixed(1); // Show one decimal place
                            }

                            // Handle boolean values (fire, water level)
                            if (typeof rawValue === "boolean") {
                              return rawValue ? "Yes" : "No";
                            }

                            // Return raw value as fallback
                            return rawValue;
                          })()}
                          suffix={suffix || ""}
                          valueStyle={{
                            color: (() => {
                              const value =
                                sensorData?.[
                                  name.toLowerCase().replace(" ", "")
                                ]?.[key];

                              // Gray for no data
                              if (value == null) return "gray";

                              // For temperature
                              if (key === "temperature") {
                                const temp = parseFloat(value);
                                if (isNaN(temp)) return "gray";
                                return temp > 25
                                  ? "red"
                                  : temp < 20
                                  ? "blue"
                                  : "green";
                              }

                              // For humidity
                              if (key === "humidity") {
                                const humidity = parseFloat(value);
                                if (isNaN(humidity)) return "gray";
                                return humidity > 70
                                  ? "blue"
                                  : humidity < 30
                                  ? "red"
                                  : "green";
                              }

                              // For binary sensors (fire, water level)
                              if (typeof value === "boolean") {
                                return value ? "red" : "green";
                              }

                              return color || "gray";
                            })(),
                            fontSize: "0.9rem",
                          }}
                        />
                      </Card>
                    </Col>
                  )
                )}
              </Row>
            </Col>
          )}
        </Row>
      </Card>
    );
  };

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        maxWidth: "1600px",
        margin: "0 auto",
      }}
    >
      <Layout.Header
        style={{
          background: "linear-gradient(to right, #4e54c8, #8f94fb)",
          color: "white",
          textAlign: "center",
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography.Title
          level={2}
          style={{
            color: "white",
            margin: 0,
            fontSize: "1.5rem",
          }}
        >
          Smart Home Dashboard
        </Typography.Title>
        <Tag color={mqttConnected ? "green" : "red"}>
          {mqttConnected ? "MQTT Connected" : "MQTT Disconnected"}
        </Tag>
      </Layout.Header>

      <Layout.Content
        style={{
          padding: "24px",
          maxWidth: "1400px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {account ? (
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Device ID Selection */}
            <Space
              direction="horizontal"
              style={{
                width: "100%",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <Space>
                <Typography.Text strong>
                  Set Control Panel for Device ID:{" "}
                </Typography.Text>
                <Input
                  type="number"
                  placeholder="Enter Device ID"
                  value={deviceIdInput}
                  onChange={(e) => setDeviceIdInput(e.target.value)}
                  style={{ width: "150px" }}
                  addonAfter={
                    <ArrowRightOutlined
                      style={{ cursor: "pointer", color: "blue" }}
                      onClick={() => {
                        if (
                          deviceIdInput === "" ||
                          isNaN(deviceIdInput) ||
                          deviceIdInput < 0
                        ) {
                          return message.error(
                            "Please enter a valid device ID"
                          );
                        }
                        setDeviceId(deviceIdInput);
                        setLoading({});
                        setPinStates({});
                        message.info(
                          `Control Panel is now set for Device: ${deviceIdInput}`
                        );
                      }}
                    />
                  }
                />
              </Space>
              <Button
                type="primary"
                title="Register a new device"
                onClick={handleRegisterDevice}
                loading={loading.registerDevice || false}
                icon={<PlusCircleOutlined />}
              >
                Register Device
              </Button>
            </Space>

            {/* Ownership Transfer Section */}
            <Space
              direction="horizontal"
              style={{
                width: "100%",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <Space>
                <Typography.Text strong>Current Device Owner:</Typography.Text>
                <Typography.Text>{deviceOwner || "Not Set"}</Typography.Text>
              </Space>
              <Space>
                <Input
                  placeholder="New Owner Address"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  style={{ width: "250px" }}
                />
                <Button
                  type="primary"
                  icon={<UserSwitchOutlined />}
                  onClick={() => handleTransferDeviceOwnership(newOwner)}
                  loading={loading.transferOwnership || false}
                >
                  Transfer Ownership
                </Button>
              </Space>
            </Space>

            {/* Room Cards Section */}
            {deviceId !== null && (
              <Row gutter={[16, 16]}>
                {Object.values(roomConfigurations).map((room) => (
                  <Col key={room.name} xs={24} sm={24} md={24} lg={24}>
                    <RoomCard room={room} />
                  </Col>
                ))}
              </Row>
            )}
          </div>
        ) : (
          <div
            className="hero-section"
            style={{
              textAlign: "center",
              padding: "50px 20px",
            }}
          >
            <h1>
              Welcome to{" "}
              <span
                style={{
                  color: "blue",
                  fontWeight: "bold",
                  fontSize: "1.5em",
                }}
              >
                Raspi Connect
              </span>
            </h1>
            <h2>
              Decentralized Smart Home IoT platform that allows you to control
              Raspberry Pi using blockchain
            </h2>
            <h2>Please connect your wallet to get started!</h2>
          </div>
        )}
      </Layout.Content>
    </Layout>
  );
}

export default App;
