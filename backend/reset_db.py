import models
import database

print("Dropping all tables...")
models.Base.metadata.drop_all(bind=database.engine)
print("Creating all tables...")
models.Base.metadata.create_all(bind=database.engine)
print("Database reset complete.")
