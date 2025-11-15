import RPi.GPIO as GPIO
import os
import aiohttp
import time
import asyncio

GPIO.setmode(GPIO.BCM)
NINJA_PIN = 23
COWBOY_PIN = 18

GPIO.setup(COWBOY_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(NINJA_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
URL_PREFIX=os.getenv('CVN_SERVER_URL')


async def fire_request(target):
    async with aiohttp.ClientSession() as session:
        async with session.get(target) as response:
            print(target, await response.text())

async def watch_button(pin, target):
    url = f'{URL_PREFIX}/{target}'
    prev_state = False
    background_tasks = set()
    while True:
        pressed = not GPIO.input(pin)
        if pressed and not prev_state:
            firenforget = asyncio.create_task(fire_request(url))
            background_tasks.add(firenforget)
            firenforget.add_done_callback(background_tasks.discard)
        else:
            await asyncio.sleep(0.05)
        prev_state = pressed


async def main():
    tasks = [asyncio.create_task(watch_button(COWBOY_PIN, 'cowboy')),
             asyncio.create_task(watch_button(NINJA_PIN, 'ninja'))]
    await asyncio.gather(*tasks)
    

if __name__ == '__main__':
   asyncio.run(main()) 

