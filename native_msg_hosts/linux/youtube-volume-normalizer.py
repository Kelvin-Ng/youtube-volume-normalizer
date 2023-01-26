#!/usr/bin/env -S python3 -u

import subprocess
import math
import json
import struct
import sys

# https://gist.github.com/angeloped/2ffc421aa269ff298b602030efc38f0f
def get_master_volume():
    proc = subprocess.Popen('/usr/bin/amixer -D pulse sget Master', shell=True, stdout=subprocess.PIPE, text=True)
    amixer_stdout = proc.communicate()[0].split('\n')[5]
    proc.wait()
    find_start = amixer_stdout.find('[') + 1
    find_end = amixer_stdout.find('%]', find_start)
    return float(amixer_stdout[find_start:find_end])

def set_master_volume(volume):
    val = int(round(volume))
    proc = subprocess.Popen('/usr/bin/amixer -D pulse sset Master ' + str(val) + '%', shell=True, stdout=subprocess.PIPE)
    proc.wait()

def db2ratio(db):
    return 10. ** (db / 20. / 3.)

def ratio2db(ratio):
    return 20. * 3. * math.log10(ratio)

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

    ratio = get_master_volume() / 100.

    # We want to make sure that it actually revert to the original volume
    # Since the original volume must be an integer, we have to round it before applying the new adjustment
    ratio *= db2ratio(-msg.get('prevDb'))
    ratio = round(ratio, 2)
    ratio *= db2ratio(msg.get('newDb'))

    set_master_volume(ratio * 100.)

    sendMessage(encodeMessage('Success: {}dB -> {}dB'.format(msg.get('prevDb'), msg.get('newDb'))))

def test():
    ratio = get_master_volume() / 100.

    ratio *= db2ratio(-1.)
    ratio = round(ratio, 2)
    ratio *= db2ratio(6.)

    set_master_volume(ratio * 100.)

if __name__ == "__main__":
    main()
    #test()

