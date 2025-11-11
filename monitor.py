import RPi.GPIO as GPIO
import os
import requests
import time
import asyncio

GPIO.setmode(GPIO.BCM)

GPIO.setup(18, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(23, GPIO.IN, pull_up_down=GPIO.PUD_UP)
URL_PREFIX=os.getenv('CVN_SERVER_URL')

async def watch_button(pin, target):
    while True:
        pressed = not GPIO.input(pin)
        if pressed:
            print(target, requests.get(f'{URL_PREFIX}/{target}'))
        await asyncio.sleep(0.1)


async def main():
    tasks = [asyncio.create_task(watch_button(23, 'cowboy')), asyncio.create_task(watch_button(18, 'ninja'))]
    await asyncio.gather(*tasks)
    

if __name__ == '__main__':
   asyncio.run(main()) 

