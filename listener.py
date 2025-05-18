import os
import json
from dotenv import load_dotenv
from web3 import Web3, HTTPProvider
#from RPi.GPIO import GPIO  # For real rasp-pi
from RPiSim.GPIO import GPIO  # For simulation

# Load environment variables
load_dotenv()

# Define the GPIO pins and their room mappings
gpio_mapping = {
    14: "Room 1 Fan",
    15: "Room 1 Light",
    18: "Room 2 Fan",
    23: "Room 2 Light",
    24: "Room 3 Fan",
    25: "Room 3 Light"
}

def setup_gpio_pins():
    # Set up GPIO pins
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    for pin in gpio_mapping.keys():
        GPIO.setup(pin, GPIO.OUT)

def main():
    # Get RPC URL from environment variables
    rpc_url = os.getenv("RPC_URL", "https://sepolia.infura.io/v3/93a0b3c64c20485aa3a1e9886e4faba9")
    # Initialize web3.py instance
    w3 = Web3(HTTPProvider(rpc_url))
    
    # Load contract ABI and address
    abi = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "deviceId", "type": "uint256"},
            {"indexed": True, "internalType": "uint8", "name": "pin", "type": "uint8"},
            {"indexed": False, "internalType": "enum PinController.PinStatus", "name": "status", "type": "uint8"}
        ],
        "name": "DevicePinStatusChanged",
        "type": "event"
    }
]
    contract_address = Web3.to_checksum_address(os.getenv("CONTRACT_ADDRESS", "0x5Bd4d84A0Abee57fCE4cD9064A21068813305f74"))

    # Initialize contract instance and event filter
    contract_instance = w3.eth.contract(address=contract_address, abi=abi)
    device_id  = input("Enter the device id: ")
    event_filter = contract_instance.events.DevicePinStatusChanged.create_filter(fromBlock="latest", argument_filters={"deviceId": int(device_id)})

    # Initialize GPIO pins
    setup_gpio_pins()

    print(f"Listening for DevicePinStatusChanged events for device {device_id}")
    # Loop to listen for events
    while True:
        for event in event_filter.get_new_entries():
            try:
                print("PinStatusChanged event:", event['args'])
                pin_number = event['args']['pin']
                if pin_number in gpio_mapping:
                    pin_status = event['args']['status']
                    GPIO.output(pin_number, GPIO.HIGH if pin_status else GPIO.LOW)
                    print(f'{gpio_mapping[pin_number]} {"ON" if pin_status else "OFF"}')
                else:
                    print(f'Pin {pin_number} is not mapped to a room. Skipping...')
            except Exception as e:
                print("An error occurred:", e)
                continue

if __name__ == "__main__":
    main()
