from fastapi import FastAPI, UploadFile, File, Form
from ultralytics import YOLO
from PIL import Image
import io, json

