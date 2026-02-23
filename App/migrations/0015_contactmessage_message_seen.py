from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("App", "0014_contactmessage"),
    ]

    operations = [
        migrations.AddField(
            model_name="contactmessage",
            name="message_seen",
            field=models.BooleanField(default=False),
        ),
    ]
