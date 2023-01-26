#!/usr/bin/env -S python3 -u

import json
import struct
import sys

from ctypes import POINTER, cast
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

def getMessage():
    rawLength = sys.stdin.buffer.read(4)
    if len(rawLength) == 0:
        send_message('Failed in reading data')
        sys.exit(0)
    messageLength = struct.unpack('@I', rawLength)[0]
    message = sys.stdin.buffer.read(messageLength).decode('utf-8')
    return json.loads(message)

def encodeMessage(messageContent):
    # https://docs.python.org/3/library/json.html#basic-usage
    # To get the most compact JSON representation, you should specify 
    # (',', ':') to eliminate whitespace.
    # We want the most compact representation because the browser rejects # messages that exceed 1 MB.
    encodedContent = json.dumps(messageContent, separators=(',', ':')).encode('utf-8')
    encodedLength = struct.pack('@I', len(encodedContent))
    return {'length': encodedLength, 'content': encodedContent}

def sendMessage(encodedMessage):
    sys.stdout.buffer.write(encodedMessage['length'])
    sys.stdout.buffer.write(encodedMessage['content'])
    sys.stdout.buffer.flush()

def main():
    #print('YouTube Volume Normalizer (host) started')

    msg = getMessage()

    #print('YouTube Volume Normalizer (host): Adjusting system volume offset from {}dB to {}dB'.format(msg.prevDb, msg.newDb))

    devices = AudioUtilities.GetSpeakers()
    interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
    volume = cast(interface, POINTER(IAudioEndpointVolume))

    newVol = volume.GetMasterVolumeLevel() - msg.get('prevDb') + msg.get('newDb')
    volume.SetMasterVolumeLevel(newVol, None)

    sendMessage(encodeMessage('Success: {}dB -> {}dB'.format(msg.get('prevDb'), msg.get('newDb'))))

def test():
    devices = AudioUtilities.GetSpeakers()
    interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
    volume = cast(interface, POINTER(IAudioEndpointVolume))

    newVol = volume.GetMasterVolumeLevel() + 5
    volume.SetMasterVolumeLevel(newVol, None)

if __name__ == "__main__":
    main()
    #test()

