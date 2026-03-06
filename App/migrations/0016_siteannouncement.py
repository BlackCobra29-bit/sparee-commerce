from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("App", "0015_contactmessage_message_seen"),
    ]

    operations = [
        migrations.CreateModel(
            name="SiteAnnouncement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("message", models.CharField(max_length=280)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ("-updated_at",),
            },
        ),
    ]
